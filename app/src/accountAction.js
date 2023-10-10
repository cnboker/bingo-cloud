import axios from 'axios'
import { LOGIN_RESPONSE, SIGNUP_RESPONSE, UPDATE_TOKEN, LOGOUT, ERROR_RESETS, REQUEST_USER_TOKEN } from './accountConstants'
import { apiResponseError } from './actions'

const loginUrl = `${process.env.REACT_APP_AUTH_URL}/api/token`
const signupUrl = `${process.env.REACT_APP_AUTH_URL}/api/signup`

export const errorReset = () => {
  return { type: ERROR_RESETS }
}
export const loginResponse = (payload) => {
  return { type: LOGIN_RESPONSE, payload }
}

export const signupResponse = (payload) => {
  return { type: SIGNUP_RESPONSE, payload }
}

export const updateToken = (payload) => {
  return { type: UPDATE_TOKEN, payload }
}
export const receiveToken = (payload) => {
  return {
    type: REQUEST_USER_TOKEN,
    payload,
  }
}
export const logout = () => {
  return { type: LOGOUT }
}
export const login = (userName, password, returnUrl) => (dispatch) => {
  var formdata = new FormData()
  formdata.append('userName', userName)
  formdata.append('password', password)
  formdata.append('returnUrl', returnUrl)
  console.log('formdata', formdata, loginUrl)
  axios({
    method: 'post',
    url: loginUrl,
    headers: { 'Content-Type': 'multipart/form-data' },
    data: formdata,
  })
    .then((response) => {
      dispatch(loginResponse(response.data))
    })
    .catch((e) => {
      dispatch(apiResponseError(e.response.data))
    })
}

export const signup = (userName, password, email) => (dispatch) => {
  axios({
    method: 'post',
    url: signupUrl,
    headers: {
      'Content-Type': 'application/json',
    },
    data: { userName, password, email },
  })
    .then((response) => {
      dispatch(signupResponse(response.data))
    })
    .catch((e) => {
      dispatch(apiResponseError(e.response.data))
    })
}

export const requestToken = (userName, token) => (dispatch) => {
  var formData = new FormData()
  formData.append('userName', userName)
  formData.append('token', token)

  axios({
    method: 'post',
    url: `${process.env.REACT_APP_AUTH_URL}/api/customerToken`,
    data: formData,
    headers: { 'Content-Type': 'multipart/form-data' },
  })
    .then((res) => {
      dispatch(receiveToken(res.data))
    })
    .catch((e) => {
      console.log('requesttoken', e)
      // toast.error(e.message, { position: toast.POSITION.BOTTOM_CENTER });
    })
}
