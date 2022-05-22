import {
  SIGNUP_RESPONSE,
  LOGIN_RESPONSE,
  LOGOUT,
  UPDATE_TOKEN,
  ERROR_RESETS,
} from './accountConstants'
import { API_RESPONSE_ERROR } from './constants'
import Cookies from 'js-cookie'
import jwtDecode from 'jwt-decode'
// where we'll manage the piece of state related to this container
const initialState = {
  signupSuccess: false,
  error: '',
  authenticated: false,
}
const cookieDomain = `${process.env.REACT_APP_COOKIE_DOMAIN}`
const securityReducer = (state = initialState, action) => {
  switch (action.type) {
    case ERROR_RESETS:
      return { ...initialState, error: '' }
    case UPDATE_TOKEN:
      return action.payload
    case SIGNUP_RESPONSE:
      return {
        signupSuccess: true,
      }
    case LOGIN_RESPONSE:
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      return tokenParse(action.payload)
    case API_RESPONSE_ERROR:
      return {
        error: action.payload,
      }
    case LOGOUT:
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      logout()
      console.log('logout...')
      return initialState
    default:
      return state
  }
}

const logout = () => {
  // var mqttConnector = require('~/views/dms2/api/mqtt_api')
  // mqttConnector.unSubscrible()
  //remove our token
  localStorage.removeItem('token')
  Cookies.remove('token', { path: '', domain: cookieDomain })
}

const tokenParse = (token) => {
  var { userName, email, userSetting, isAgent, agentUser } = jwtDecode(token.access_token)
  userSetting = userSetting ? JSON.parse(userSetting) : {}
  token = {
    ...token,
    email,
    userSetting,
    isAgent: isAgent === 'true',
    agentUser,
    userName,
    authenticated: true,
  }
  //agent
  if (token.isAgent) {
    token.agentToken = token.access_token
  }

  var tokenString = JSON.stringify(token)
  localStorage.setItem('token', tokenString)

  Cookies.set('token', tokenString, { expires: 7, path: '', domain: cookieDomain })
  return token
}
export default securityReducer
