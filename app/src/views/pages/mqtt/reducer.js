import { MQTT_DOWNLOAD_PROGRESS } from './contants'

export const mqttDownloadProgressReducer = (state = {}, action) => {
  switch (action.type) {
    case MQTT_DOWNLOAD_PROGRESS:
      const { deviceId } = action.payload
      state[deviceId] = action.payload
      return { ...state }
    default:
      return state
  }
}
