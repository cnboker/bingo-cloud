import {
  ORDER_TRIAL_CREATE_RESPONSE,
  ORDER_SESSION_LIST_RESPONSE,
  ORDER_CREATE_RESPONSE,
  ORDER_CHECKOUT_RESPONSE,
} from './constants'

const initialState = {
  //能否允许创建试用
  isCreateTrial: true,
  trialCreateSuccess: false,
  order: {},
  //单价/天
  price: 0.5,
  //试用设备数量
  trialDeviceCount: 5,
  discount: 5, //5 point discount
}

export const orderContextReducer = (state = initialState, action) => {
  var newState = { ...state }
  switch (action.type) {
    case ORDER_SESSION_LIST_RESPONSE:
      return { ...state, ...action.payload }
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
