import { SIGNUP_REQUESTING } from './constants'

const signupRequest = function signupRequest ({ userName, email, password,client }) {  
  return {
    type: SIGNUP_REQUESTING,
    userName,
    email,
    password,
    client
  }
}
export default signupRequest