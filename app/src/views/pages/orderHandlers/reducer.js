import { flagSet } from '@coreui/icons'
import {
  ORDER_TRIAL_CREATE_RESPONSE,
  ORDER_SESSION_LIST_RESPONSE,
  ORDER_CREATE_RESPONSE,
  ORDER_CHECKOUT_RESPONSE,
} from './constants'

const initialState = {
  //能否允许创建试用,通过该属性可以判断用户有无开通试用或下单
  isCreateTrial: false,
  trialCreateSuccess: false,
  order: {},
  //单价/天
  price: 0.5,
  //试用设备数量
  trialDeviceCount: 5,
  trialDays: 30,
  discount: 5, //5 point discount,
  orderSessionRequestSuccess: false,
}

export const orderContextReducer = (state = initialState, action) => {
  var newState = { ...state }
  switch (action.type) {
    case ORDER_SESSION_LIST_RESPONSE:
      return { ...state, ...action.payload, orderSessionRequestSuccess: true }
    case ORDER_TRIAL_CREATE_RESPONSE:
    case ORDER_CREATE_RESPONSE:
      newState.order = action.payload
      return newState
    case ORDER_CHECKOUT_RESPONSE:
      return action.payload
    default:
      return state
  }
}
