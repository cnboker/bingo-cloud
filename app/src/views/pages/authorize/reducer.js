import { DEVICE_AUTHORIZE_RESPONSE, AUTHORIZE_LIST_RESPONSE, AUTHORIZE_TOKEN_RESPONSE } from './constants'
import merge from 'lodash/merge'

const initialState = []

export const authorizeReducer = (state = initialState, action) => {
  var newState = merge([], state)
  switch (action.type) {
    case DEVICE_AUTHORIZE_RESPONSE:
      console.log('DEVICE_AUTHORIZE_SUCCESS success', action.payload)
      const { deviceId } = action.payload
      var cur = newState.find((x) => x.deviceId === deviceId)
      if (cur) {
        cur.authorizeStatus = 1
      }
      return newState
    case AUTHORIZE_LIST_RESPONSE:
      return action.payload
    default:
      return newState
  }
}

export const tokenReducer = (state = initialState, action) => {
  switch (action.type) {
    case AUTHORIZE_TOKEN_RESPONSE:
      return action.payload
    default:
      return state
  }
}
