import { RECEIVE_DOWNLOAD_PROGRESS_UPDATE } from "./constants";
import merge from "lodash/merge";

const initialState = {};

export const downloadProgressReducer = (state = initialState, action) => {
  Object.freeze(state);
  let newState = merge([], state);
  switch (action.type) {
    case RECEIVE_DOWNLOAD_PROGRESS_UPDATE:
      newState[action.payload.deviceId] = action.payload;
      return newState;
    default:
      return state;
  }
};
