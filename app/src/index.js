import 'react-app-polyfill/stable'
import 'core-js'
import React from 'react'
import ReactDOM from 'react-dom'
import App from './App'
import * as serviceWorker from './serviceWorker'
import { Provider } from 'react-redux'
import IndexReducer from './index-reducer'
import { createStore, compose, applyMiddleware } from 'redux'
import createSegaMiddleware from 'redux-saga'
import reduxReset from 'redux-reset'
import IndexSagas from './index-sagas'
import thunk from 'redux-thunk'
const sagaMiddleware = createSegaMiddleware()
const composeSetup =
  process.env.NODE_ENV !== 'production' &&
  typeof window === 'object' &&
  window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__
    ? window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__
    : compose
/*eslint-enable */
const store = createStore(
  IndexReducer,
  composeSetup(applyMiddleware(sagaMiddleware, thunk), reduxReset()),
)

sagaMiddleware.run(IndexSagas)

ReactDOM.render(
  <Provider store={store}>
    <App />
  </Provider>,
  document.getElementById('root'),
)

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: http://bit.ly/CRA-PWA
serviceWorker.unregister()
