import {
  CLIENT_SET,
  CLIENT_UNSET,
  RECEIVE_USER_EXTENDER,
  UPDATE_USER_EXTENDER,
  RECEIVE_CMS_USER
} from "./constants";

const initialState = {
  userSetting: {
    nickName: "",
    email: "",
    mobile1: "",
    mobile2: "",
    day7Notify: false,
  },
};

const reducer = (state = initialState, action) => {
  var newstate = Object.assign({}, state);
  switch (action.type) {
    case CLIENT_SET:
      // if (
      //   state.token != null 
      // ) {
      //   return state;
      // }
      return {
        ...action.token,
      };

    case CLIENT_UNSET:
      return { token: null };
    case RECEIVE_USER_EXTENDER:
    case UPDATE_USER_EXTENDER:
      newstate.userSetting = action.payload;
      return newstate;
      case RECEIVE_CMS_USER:
        
        newstate.CMSUser = action.payload;
        var tokenString = JSON.stringify(newstate);
        localStorage.setItem("token", tokenString);
        return newstate;
    default:
      return state;
  }
};

export default reducer;
