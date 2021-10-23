import React from "react";
import ReactDOM from "react-dom";
import * as serviceWorker from "./serviceWorker";
import { Provider } from "react-redux";
import IndexReducer from "./index-reducer";
//import { loadingBarMiddleware } from "react-redux-loading-bar";
import { applyMiddleware, compose, createStore } from "redux";
import thunk from "redux-thunk";
import { Route, BrowserRouter as Router, Switch } from "react-router-dom";
import config from "./config";
// Polyfill, modifying the global Object
require("es6-object-assign").polyfill();
/*eslint-disable */
const composeSetup = process.env.NODE_ENV !== "production" && typeof window === "object" && window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__
  ? window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__
  : compose;
/*eslint-enable */
const store = createStore(IndexReducer, composeSetup(applyMiddleware(thunk)));

var render = Component => (
    <Provider store={ store }>
        <Router>
            <Switch>
                <Route path="/" extact component={ Component }/>
            </Switch>
        </Router>
    </Provider>
);

window.addEventListener("load", () => {
    var root = document.getElementById("root");
    ReactDOM.render(render(config.defaultApp), root);
});

serviceWorker.unregister();
