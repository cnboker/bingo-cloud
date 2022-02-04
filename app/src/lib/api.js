import axios from 'axios'
import * as Dialog from 'src/views/components/dialog/Index'
import * as auth from './check-auth'

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
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

export const asyncDelete = (params) => {
  const { url, data } = params
  var headers = auth.authHeader()
  return axios({
    method: 'delete',
    url,
    data,
    headers,
  })
}

export const asyncPost = (params) => {
  const { url, data } = params
  var headers = auth.authHeader()
  return axios({
    method: 'post',
    url,
    data,
    headers,
  })
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
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
      if (e.response) {
        Dialog.toast(e.response.data)
      } else if (e.message) {
        Dialog.toast(e.message)
      }
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
      if (e.response) {
        Dialog.toast(e.response.data)
      } else if (e.message) {
        Dialog.toast(e.message)
      }
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
      if (e.response) {
        Dialog.toast(e.response.data)
      } else if (e.message) {
        Dialog.toast(e.message)
      }
    })
}
