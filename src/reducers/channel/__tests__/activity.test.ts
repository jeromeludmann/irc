import { reduceActivity } from "@app/reducers/channel/activity";
import { messageReceivers } from "@app/actions/msgIncoming";
import { switchWindow } from "@app/actions/ui";

describe("reduce channel activity", () => {
  const extraParams = {
    user: { nick: "nick", user: "user", real: "name" },
    route: { serverKey: "server1", channelKey: "#channel" },
  };

  test("by joining channel", () => {
    expect(
      reduceActivity(
        undefined,
        messageReceivers["JOIN"](
          "server1",
          {
            nick: "nick",
            user: "user",
            host: "host",
          },
          ["#channel"],
        ),
        extraParams,
      ),
    ).toMatchSnapshot();
  });

  test("by switching window", () => {
    expect(
      reduceActivity(
        undefined,
        switchWindow({ serverKey: "server1", channelKey: "#channel" }),
        extraParams,
      ),
    ).toMatchSnapshot();
  });
});
