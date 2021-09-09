import axios from 'axios'
import { LOGIN_RESPONSE, SIGNUP_RESPONSE, UPDATE_TOKEN, LOGOUT } from './accountConstants'
import { API_RESPONSE_ERROR } from './constants'

const loginUrl = `${process.env.REACT_APP_AUTH_URL}/api/token`
const signupUrl = `${process.env.REACT_APP_AUTH_URL}/api/signup`

export const loginResponse = (payload) => {
  return { type: LOGIN_RESPONSE, payload }
}

export const signupResponse = (payload) => {
  return { type: SIGNUP_RESPONSE, payload }
}

export const apiResponseError = (payload) => {
  return { type: API_RESPONSE_ERROR, payload }
}

export const updateToken = (payload) => {
  return { type: UPDATE_TOKEN, payload }
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
