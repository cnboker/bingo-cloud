import { AUTHORIZE_LIST_RESPONSE, DEVICE_AUTHORIZE_RESPONSE, AUTHORIZE_TOKEN_RESPONSE } from './constants'
import { get, post } from 'src/lib/api'

const authorizeUrl = `${process.env.REACT_APP_SERVICE_URL}/api/license/authorize`
const unAuthorizeListUrl = `${process.env.REACT_APP_SERVICE_URL}/api/license/unAuthorizedList`
const sessionTokenUrl = `${process.env.REACT_APP_AUTH_URL}/api/authSessionToken/`

export const authorizeResponse = (payload) => {
  return {
    type: DEVICE_AUTHORIZE_RESPONSE,
    payload,
  }
}

export const unAuthorizeListResponse = (payload) => {
  return {
    type: AUTHORIZE_LIST_RESPONSE,
    payload,
  }
}

export const tokenResponse = (payload) => {
  return {
    type: AUTHORIZE_TOKEN_RESPONSE,
    payload,
  }
}

//push user jwt token to deviceSession object
export const tokenPost = (authorizeCode) => (dispatch) => {
  dispatch(
    post({
      url: `${sessionTokenUrl}${authorizeCode}`,
      responseAction: tokenResponse,
    }),
  )
}

export const authorizeRequest = (deviceId) => (dispatch) => {
  dispatch(
    post({
      url: `${authorizeUrl}`,
      data: { deviceId },
      responseAction: authorizeResponse,
    }),
  )
}

export const unAuthorizeListRequest = () => (dispatch) => {
  dispatch(
    get({
      url: unAuthorizeListUrl,
      responseAction: unAuthorizeListResponse,
    }),
  )
}
