import axios from 'axios'
import * as Dialog from 'src/views/components/dialog/Index'
var auth = require('./check-auth')

export const asyncGet = (params) => {
  const { url, data } = params
  var headers = auth.authHeader()
  return axios({
    method: 'get',
    url,
    data,
    headers,
  })
}

export const get = (params) => (dispatch) => {
  const { url, data, responseAction } = params
  var headers = auth.authHeader()
  axios({
    method: 'get',
    url,
    data,
    headers,
  })
    .then((response) => {
      dispatch(responseAction(response.data))
    })
    .catch((e) => {
      Dialog.toast(e.response.data)
    })
}
export const deleteObject = (params) => (dispatch) => {
  const { url, responseAction } = params
  var headers = auth.authHeader()
  axios({
    method: 'delete',
    url,
    headers,
  })
    .then((response) => {
      dispatch(responseAction(response.data))
    })
    .catch((e) => {
      //dispatch(apiResponseError(e.response.data))
      Dialog.toast(e.response.data)
    })
}

export const post = (params) => (dispatch) => {
  const { url, data, responseAction } = params
  var headers = auth.authHeader()
  axios({
    method: 'post',
    url,
    headers,
    data,
  })
    .then((response) => {
      dispatch(responseAction(response.data))
    })
    .catch((e) => {
      Dialog.toast(e.response.data)
    })
}
