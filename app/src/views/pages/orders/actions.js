import {
  ORDER_TRIAL_CREATE_RESPONSE,
  ORDER_SESSION_LIST_RESPONSE,
  ORDER_CREATE_RESPONSE,
  ORDER_CHECKOUT_RESPONSE,
} from './constants'
import { get, post, asyncGet } from 'src/lib/api'

export const trialResponse = (payload) => {
  return { type: ORDER_TRIAL_CREATE_RESPONSE, payload }
}

export const orderSessionResponse = (payload) => {
  return { type: ORDER_SESSION_LIST_RESPONSE, payload }
}

export const orderCreateResponse = (payload) => {
  return { type: ORDER_CREATE_RESPONSE, payload }
}

export const orderCheckoutResponse = (payload) => {
  return { type: ORDER_CHECKOUT_RESPONSE, payload }
}

export const codeCheck = (code) => {
  const url = `${process.env.REACT_APP_SERVICE_URL}/api/order/codeCheck/${code}`
  return asyncGet({ url })
}

//获取用户订单会话
export const getOrderSession = () => (dispatch) => {
  const url = `${process.env.REACT_APP_SERVICE_URL}/api/ordersession`
  dispatch(
    get({
      url,
      responseAction: orderSessionResponse,
    }),
  )
}

export const createTrial = () => (dispatch) => {
  dispatch(
    post({
      url: `${process.env.REACT_APP_SERVICE_URL}/api/order/trial`,
      responseAction: trialResponse,
    }),
  )
}

export const createOrder = (q) => (dispatch) => {
  dispatch(
    post({
      url: `${process.env.REACT_APP_SERVICE_URL}/api/order/create`,
      data: q,
      responseAction: orderCreateResponse,
    }),
  )
}

export const checkout = (q) => (dispatch) => {
  dispatch(
    post({
      url: `${process.env.REACT_APP_SERVICE_URL}/api/order/create`,
      data: q,
      responseAction: orderCheckoutResponse,
    }),
  )
}
