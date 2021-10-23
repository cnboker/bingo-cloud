import { CLIENT_SET, CLIENT_UNSET, RECEIVE_USER_EXTENDER, RECEIVE_CMS_USER } from './constants'
import axios from 'axios'
import * as auth from '~/lib/check-auth'
import { toast } from 'src/views/components/dialog/Index'
export function setClient(token) {
  return { type: CLIENT_SET, token }
}

export function unsetClient() {
  return { type: CLIENT_UNSET }
}

export const receiveUserExtender = (payload) => {
  return { type: RECEIVE_USER_EXTENDER, payload }
}

export const receiveCMSUser = (payload) => {
  return { type: RECEIVE_CMS_USER, payload }
}

export const getUserExtender = () => (dispatch) => {
  var url = `${process.env.REACT_APP_AUTH_URL}/api/user/extender`
  var headers = auth.authHeader()
  axios({ url, method: 'get', headers })
    .then((x) => {
      if (Object.keys(x.data).length === 0) return
      dispatch(receiveUserExtender(x.data))
    })
    .catch((e) => {
      console.log('getUserExtender', e)
    })
}

//当用户点击内容管理的时候， 更新client.CMSUser=true
export const setCMSUser = (isCMSUser) => (dispatch) => {
  dispatch(receiveCMSUser(isCMSUser))
}

export const updateUserExtender = (data) => (dispatch) => {
  var url = `${process.env.REACT_APP_AUTH_URL}/api/user/updateExtender`
  var headers = auth.authHeader()
  axios({ url, method: 'post', data, headers })
    .then((x) => {
      toast('操作成功')
      dispatch(receiveUserExtender(data))
    })
    .catch((e) => {
      console.log('getUserExtender', e)
      toast(e.response.data)
    })
}

export const getEmailToken = (email) => (dispatch) => {
  var url = `${process.env.REACT_APP_AUTH_URL}/api/account/forgetPassword`
  axios({
    url,
    method: 'post',
    data: {
      email,
    },
  })
    .then((x) => {
      console.log('x', x)
      toast.success(x.data, { position: toast.POSITION.BOTTOM_CENTER })
    })
    .catch((e) => {
      toast.error(e.response.data, { position: toast.POSITION.BOTTOM_CENTER })
    })
}

export const resetPassword = (data) => (dispatch) => {
  var url = `${process.env.REACT_APP_AUTH_URL}/api/account/resetPassword`
  var headers = auth.authHeader()
  axios({
    url,
    method: 'post',
    data,
    headers,
  })
    .then((x) => {
      toast('reset password finished!')
    })
    .catch((e) => {
      toast(e.response.data)
    })
}

//重置无需邮件
export const resetPassword1 = (data) => (dispatch) => {
  var url = `${process.env.REACT_APP_AUTH_URL}/api/account/resetPassword1`
  var headers = auth.authHeader()
  axios({
    url,
    method: 'post',
    data,
    headers,
  })
    .then((x) => {
      toast('操作成功')
    })
    .catch((e) => {
      toast(e.response.data, { position: toast.POSITION.BOTTOM_CENTER })
    })
}
