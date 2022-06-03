//文件下载进度
export const MQTT_DOWNLOAD_PROGRESS = 'mqttDownloadProgress'
//新内容通知
export const MQTT_CONTENT_NOTIFY = 'mqttContentNotify'
//服务器抓取照片通知
export const MQTT_SNAPSHOT_NOTIFY = 'mqttSnapshotNotify'

export type DownloadResult = {
  deviceId: string
  fileName: string
  ticket: string
  amountReceived: number
  amountTotal: number
  completed: boolean
}
