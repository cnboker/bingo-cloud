import { combineReducers } from "redux";
import { qrReducer } from "./QRConfigrator/reducer";

const appReducer = combineReducers({
    qrReducer
});

//https://stackoverflow.com/questions/35622588/how-to-reset-the-state-of-a-redux-store
//退出程序重置state

const IndexReducer = (state, action) => {
    // if (action.type === 'CLIENT_UNSET') {
    //   const { routing } = state
    //   state = { routing } 
    // }
    return appReducer(state, action);
};
  
export default IndexReducer;
