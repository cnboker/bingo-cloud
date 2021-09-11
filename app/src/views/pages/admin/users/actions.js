import { USER_LIST_RESPONSE, USER_DELETE_RESPONSE, USER_UPDATE_RESPONSE } from './contants'
import { get, deleteObject, post } from 'src/lib/api'

export const userListResponse = (payload) => {
  return { type: USER_LIST_RESPONSE, payload }
}

export const userDeleteResponse = (payload) => {
  return { type: USER_DELETE_RESPONSE, payload }
}

export const userUpdateResponse = (payload) => {
  return { type: USER_UPDATE_RESPONSE, payload }
}

const userListUrl = `${process.env.REACT_APP_AUTH_URL}/api/user/list`

export const userList =
  (keyword, page = 0) =>
  (dispatch) => {
    dispatch(
      get({
        url: `${userListUrl}?keyword=${keyword} & page=${page}`,
        responseAction: userListResponse,
      }),
    )
  }

export const userDelete = (userName) => (dispatch) => {
  dispatch(
    deleteObject({
      url: `${process.env.REACT_APP_AUTH_URL}/api/user/delete/${userName}`,
      responseAction: userDeleteResponse,
    }),
  )
}
export const userUpdate = (userName) => (dispatch) => {}

export const setAgent = (userName) => (dispatch) => {
  dispatch(
    post({
      url: `${process.env.REACT_APP_AUTH_URL}/api/user/setAgent/${userName}`,
      responseAction: userUpdateResponse,
    }),
  )
}
