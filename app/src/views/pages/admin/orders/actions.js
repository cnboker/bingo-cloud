import { ORDER_LIST_RESPONSE, ORDER_DELETE_RESPONSE, ORDER_UPDATE_RESPONSE } from './contants'
import { get, deleteObject, post } from 'src/lib/api'

export const userListResponse = (payload) => {
  return { type: ORDER_LIST_RESPONSE, payload }
}

export const orderDeleteResponse = (payload) => {
  return { type: ORDER_DELETE_RESPONSE, payload }
}

export const orderUpdateResponse = (payload) => {
  return { type: ORDER_UPDATE_RESPONSE, payload }
}

const orderListUrl = `${process.env.REACT_APP_SERVICE_URL}/api/order/list`

//startDate, endDate, keyword, page = 0
export const orderList = (q) => (dispatch) => {
  dispatch(
    post({
      url: `${orderListUrl}`,
      data: q,
      responseAction: userListResponse,
    }),
  )
}

export const free = (id) => (dispatch) => {
  dispatch(
    post({
      url: `${process.env.REACT_APP_SERVICE_URL}/api/order/free/${id}`,
      responseAction: orderUpdateResponse,
    }),
  )
}

export const cancel = (id) => (dispatch) => {
  dispatch(
    deleteObject({
      url: `${process.env.REACT_APP_SERVICE_URL}/api/order/cancel/${id}`,
      responseAction: orderDeleteResponse,
    }),
  )
}
