import { createSelector } from 'reselect'
import { RouteState, selectRoute } from '@app/reducers/route'
import {
  RoutedAction,
  BufferKey,
  isChannel,
  isPrivate,
  isRaw,
} from '@app/utils/Route'
import {
  RECEIVE_RPL_MYINFO,
  ReceiveReplyMyInfoAction,
  RECEIVE_NICK,
  ReceiveNickAction,
  RECEIVE_PONG_FROM_SERVER,
  ReceivePongFromServerAction,
  RECEIVE_PART,
  ReceivePartAction,
  RECEIVE_PRIVMSG,
  RECEIVE_JOIN,
} from '@app/actions/msgIncoming'
import { CaseReducerMap } from '@app/utils/CaseReducerMap'
import {
  BufferState,
  bufferInitialState,
  reduceBuffer,
} from '@app/reducers/buffer'
import { CLOSE_WINDOW, CloseWindowAction } from '@app/actions/ui'
import { selectServers } from '@app/reducers'

export type ServerState = Readonly<{
  name: string
  user: Readonly<{
    nick: string
    user: string
    real: string
  }>
  lag: number
  modes: Readonly<{
    user: string[]
    available: Readonly<{
      channel: string[]
      user: string[]
    }>
  }>
  buffers: Readonly<{
    [key: string]: BufferState
  }>
}>

type ServerReducer<S = ServerState> = (
  server: S,
  action: RoutedAction,
  extraStates: { route: RouteState },
) => S

type BufferRouterReducer = (
  buffers: { [key: string]: BufferState },
  action: RoutedAction,
  extraStates: { route: RouteState; server: ServerState },
) => { [key: string]: BufferState }

export const serverInitialState = {
  name: '<unknown>',
  user: {
    nick: 'default_nick',
    user: 'default_user',
    real: 'default_name',
  },
  lag: 0,
  modes: {
    user: [],
    available: { channel: [], user: [] },
  },
  buffers: {
    [BufferKey.RAW]: bufferInitialState,
    [BufferKey.STATUS]: bufferInitialState,
  },
}

const removeCurrentBuffer = (
  buffers: { [key: string]: BufferState },
  bufferKey: string,
) => {
  const bufferMap = { ...buffers }
  delete bufferMap[bufferKey]
  return bufferMap
}

const removeAllServerRelatedBuffers = (buffers: {
  [key: string]: BufferState
}) => {
  const bufferMap = { ...buffers }

  Object.keys(bufferMap).forEach(buffer => {
    if (isChannel(buffer) || isPrivate(buffer)) {
      delete bufferMap[buffer]
    }
  })

  return bufferMap
}

const caseReducers: CaseReducerMap<ServerReducer> = {
  [CLOSE_WINDOW]: (server, action: CloseWindowAction) => ({
    ...server,
    buffers:
      isChannel(action.route.bufferKey) || isPrivate(action.route.bufferKey)
        ? removeCurrentBuffer(server.buffers, action.route.bufferKey)
        : removeAllServerRelatedBuffers(server.buffers),
  }),

  [RECEIVE_NICK]: (server, action: ReceiveNickAction) => ({
    ...server,
    user:
      action.payload.user.nick === server.user.nick
        ? { ...server.user, nick: action.payload.nick }
        : server.user,
  }),

  // We arbitrarily decided to close window when we "/part" the channel.
  // But later, we could make this behavior customizable.
  [RECEIVE_PART]: (server, action: ReceivePartAction) =>
    action.payload.user.nick === server.user.nick
      ? {
          ...server,
          buffers: removeCurrentBuffer(server.buffers, action.payload.channel),
        }
      : server,

  [RECEIVE_PONG_FROM_SERVER]: (
    server,
    action: ReceivePongFromServerAction,
  ) => ({
    ...server,
    lag: action.payload.lag,
  }),

  [RECEIVE_RPL_MYINFO]: (server, action: ReceiveReplyMyInfoAction) => ({
    ...server,
    name: action.payload.serverName,
    modes: {
      ...server.modes,
      available: {
        channel: action.payload.availableChannelModes,
        user: action.payload.availableUserModes,
      },
    },
  }),
}

const broadcastHandlers: { [buffer: string]: BufferRouterReducer } = {
  // stop broadcasting
  [BufferKey.NONE]: buffers => buffers,

  // broadcast to active buffer
  [BufferKey.ACTIVE]: (buffers, action, extraStates) => {
    const key = extraStates.route.bufferKey
    return {
      ...buffers,
      [key]: reduceBuffer(buffers[key], action, extraStates),
    }
  },

  // broadcast to all buffers
  [BufferKey.ALL]: (buffers, action, extraStates) => {
    const toBroadcast: { [key: string]: BufferState } = {}

    Object.keys(buffers).forEach(key => {
      if (!isRaw(key)) {
        toBroadcast[key] = reduceBuffer(buffers[key], action, extraStates)
      }
    })

    return { ...buffers, ...toBroadcast }
  },
}

const routeActionToBuffers: BufferRouterReducer = (
  buffers,
  action,
  extraStates,
) => {
  if (action.route.bufferKey in broadcastHandlers) {
    return broadcastHandlers[action.route.bufferKey](
      buffers,
      action,
      extraStates,
    )
  }

  if (
    action.route.bufferKey in buffers ||
    [RECEIVE_PRIVMSG, RECEIVE_JOIN].indexOf(action.type) > -1
  ) {
    return {
      ...buffers,
      [action.route.bufferKey]: reduceBuffer(
        buffers[action.route.bufferKey],
        action,
        extraStates,
      ),
    }
  }

  return buffers
}

export const reduceServer: ServerReducer = (
  server = serverInitialState,
  action,
  extraStates,
) => {
  const intermediateState = {
    ...server,
    buffers: routeActionToBuffers(server.buffers, action, {
      ...extraStates,
      server,
    }),
  }

  return {
    ...intermediateState,
    ...(action.type in caseReducers
      ? caseReducers[action.type](intermediateState, action, extraStates)
      : {}),
  }
}

export const selectServer = createSelector(
  selectServers,
  selectRoute,
  (servers, { serverKey }) => servers[serverKey],
)

export const selectServerName = createSelector(
  selectServer,
  server => server.name,
)

export const selectUser = createSelector(selectServer, server => server.user)

export const selectServerLag = createSelector(
  selectServer,
  server => server.lag,
)

export const selectUserModes = createSelector(
  selectServer,
  server => server.modes.user,
)

export const selectAvailableModes = createSelector(
  selectServer,
  server => server.modes.available,
)

export const selectBuffers = createSelector(
  selectServer,
  server => server.buffers,
)