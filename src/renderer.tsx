import React from "react";
import { render } from "react-dom";
import { Provider } from "react-redux";
import { injectGlobal } from "styled-components";
import { store } from "@app/store";
import { App } from "@app/components/App";

render(
  <Provider store={store}>
    <App />
  </Provider>,
  document.getElementById("root"),
);

// tslint:disable-next-line
injectGlobal`
  * {
    box-sizing: border-box;
    font-family: Menlo, Monaco, Courier;
    font-size: 12px;
  }
`;
