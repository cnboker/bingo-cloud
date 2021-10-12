import React from "react";
import ReactDOM from "react-dom";
import * as serviceWorker from "./serviceWorker";
import {Provider} from "react-redux";
import IndexReducer from "./index-reducer";
//import { loadingBarMiddleware } from "react-redux-loading-bar";
import {applyMiddleware, createStore, compose} from "redux";
import thunk from 'redux-thunk'
import reduxReset from "redux-reset";
import {BrowserRouter as Router, Route, Switch} from "react-router-dom";
import config from './config'
// Polyfill, modifying the global Object
require('es6-object-assign').polyfill();
/*eslint-disable */
const composeSetup = process.env.NODE_ENV !== "production" && typeof window === "object" && window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__
  ? window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__
  : compose;
/*eslint-enable */
const store = createStore(IndexReducer, composeSetup(applyMiddleware(thunk), reduxReset()));

var render = Component => (
  <Provider store={store}>
    <Router>
      <Switch>
        <Route path="/" extact component={Component}/>
      </Switch>
    </Router>
  </Provider>
);

window.addEventListener('load', () => {
  // window.checkOS(function(){
   
  // });
  //@ts-ignore
  
  console.log('inject app')
  var root = document.getElementById("root");
  ReactDOM.render(render(config.defaultApp), root);
});

// if (module.hot) {
//   module
//     .hot
//     .accept("./App", () => {
//       //const App = require("./App").default;
//       render(config.defaultApp);
//     });
// }

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls. Learn
// more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
