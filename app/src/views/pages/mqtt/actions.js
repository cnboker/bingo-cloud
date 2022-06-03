import { MQTT_DOWNLOAD_PROGRESS } from './contants'

export const receiveDownloadProgress = () => ({
  type: MQTT_DOWNLOAD_PROGRESS,
})
