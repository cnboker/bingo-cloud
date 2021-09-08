import {LOGIN_REQUESTING,LOGIN_FINISH} from './constants'

export const loginRequest = ({userName, password,returnUrl}) =>{
  return {
    type: LOGIN_REQUESTING,
    userName,
    password,
    returnUrl
  }
}

export const loginFinish =()=>{
  return {
    type: LOGIN_FINISH
  }
}
