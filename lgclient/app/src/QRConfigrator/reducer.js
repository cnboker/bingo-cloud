import {
  RECEIVE_QR,
  RECEIVE_TOKEN,
  RECEIVE_LICENSE,
  RECEIVE_INSTANCE
} from "./actions";
import merge from "lodash/merge";

var defaultState = {
  QR: {},
  token: {},
  license: {}
};

export const qrReducer = (state = defaultState, action) => {
  Object.freeze(state);
  let newState = merge({}, state);
  switch (action.type) {
    case RECEIVE_QR:
      newState.QR = action.payload;
      return newState;
    case RECEIVE_TOKEN:
      newState.token = action.payload;
      return newState;
    case RECEIVE_LICENSE:
      newState.license = action.payload;
      return newState;
    case RECEIVE_INSTANCE:
      newState.instance = action.payload;
      return newState;
    default:
      return state;
  }
};