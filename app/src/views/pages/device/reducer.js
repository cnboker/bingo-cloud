import {
  RECEIVE_DEVICE_LIST,
  RECEIVE_DEVICE_UPDATE_NAME,
  RECEIVE_UPDATE_LICENSE,
  RECEIVE_UPDATE_GROUP,
  RECEIVE_DEVICE_SELECT,
  RECEIVE_DEVICE_SNAPSHOT_IMAGE,
  RECEIVE_DEVICE_LOGS,
  RECEIVE_DEVICE_STATUS,
  RECEIVE_DEVICE_RECYCLE,
} from './constants'
import merge from 'lodash/merge'

const initialState = []

export const deviceListReducer = (state = initialState, action) => {
  Object.freeze(state)
  let newState = merge([], state)
  let deviceInfo = null
  switch (action.type) {
    case RECEIVE_DEVICE_STATUS:
      //merge status data to state
      let merged = []
      for (let i = 0; i < state.length; i++) {
        merged.push({
          ...state[i],
          ...action.payload.find((x) => x.deviceId === state[i].deviceId),
        })
      }
      return merged
    case RECEIVE_DEVICE_LIST:
      console.log('devicelist', action.payload)
      return action.payload
    case RECEIVE_DEVICE_UPDATE_NAME:
      deviceInfo = newState.find((x) => x.deviceId === action.payload.deviceId)
      if (!deviceInfo) {
        return state
      }
      if (action.payload.newName) {
        deviceInfo.name = action.payload.newName
      }
      if (action.payload.resolution) {
        deviceInfo.resolution = action.payload.resolution
      }
      return newState
    case RECEIVE_UPDATE_LICENSE:
      if (action.payload) {
        for (let i = 0; i < newState.length; i++) {
          if (newState[i].deviceId === action.payload.deviceId) {
            newState[i] = action.payload
            break
          }
        }
      }
      return newState
    case RECEIVE_UPDATE_GROUP:
      deviceInfo = newState.find((x) => x.deviceId === action.payload.deviceId)
      deviceInfo.groupName = action.payload.groupName
      return newState
    case RECEIVE_DEVICE_SELECT:
      deviceInfo = newState.find((x) => x.deviceId === action.payload.deviceId)
      deviceInfo.selected = action.payload.selected
      return newState
    case RECEIVE_DEVICE_SNAPSHOT_IMAGE:
      if (!action.payload.key) return state
      deviceInfo = newState.find((x) => x.deviceId === action.payload.key)
      deviceInfo.spanshotImageObject = action.payload.content
      return newState
    case RECEIVE_DEVICE_RECYCLE:
      return newState.filter((x) => x.deviceId !== action.payload.deviceId)
    default:
      return state
  }
}

export const deviceLogReducer = (state = { pageCount: 1, records: [] }, action) => {
  switch (action.type) {
    case RECEIVE_DEVICE_LOGS:
      return action.payload
    default:
      return state
  }
}
