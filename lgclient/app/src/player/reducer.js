import { RECEIVE_PREPLAY, REMOTE_DATA_PUSH } from "./actions";

export const playerReducer = (state = {}, action) => {
  //Object.freeze(state);
  switch (action.type) {
    case RECEIVE_PREPLAY:
      return action.payload;
    case REMOTE_DATA_PUSH:
      return action.payload;
    default:
      return state;
  }
};
