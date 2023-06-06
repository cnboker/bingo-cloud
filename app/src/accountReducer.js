import { SIGNUP_RESPONSE, LOGIN_RESPONSE, LOGOUT, UPDATE_TOKEN, ERROR_RESETS, REQUEST_USER_TOKEN } from './accountConstants'
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

const createSecurityToken = (access_token) => {
  if (!access_token) return {}
  var { userName, email, userSetting, isAgent, agentUser } = jwtDecode(access_token)
  userSetting = userSetting ? JSON.parse(userSetting) : {}
  const token = {
    access_token,
    email,
    userSetting,
    isAgent: isAgent === 'true',
    agentUser,
    userName,
    authenticated: true,
    isAdmin: userName === 'admin',
  }
  //agent
  if (token.isAgent || token.isAdmin) {
    token.agentToken = access_token
  }

  localStorage.setItem('token', access_token)
  Cookies.set('token', access_token, { expires: 7, path: '', domain: cookieDomain })
  return token
}

const securityReducer = (state = initialState, action) => {
  switch (action.type) {
    case ERROR_RESETS:
      return { ...state, error: '' }
    case UPDATE_TOKEN:
      return { ...state, ...createSecurityToken(action.payload) }
    case SIGNUP_RESPONSE:
      return {
        signupSuccess: true,
      }
    case LOGIN_RESPONSE:
      return createSecurityToken(action.payload.access_token)
    case API_RESPONSE_ERROR:
      return {
        error: action.payload,
      }
    case LOGOUT:
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      logout()
      return initialState
    case REQUEST_USER_TOKEN:
      return { ...state, ...createSecurityToken(action.payload.access_token) }

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

export default securityReducer
