import { connect } from 'mqtt'
const mqttServer = process.env.REACT_APP_MQTT_URL

//
//文件下载进度
export const MQTT_DOWNLOAD_PROGRESS = 'mqttDownloadProgress'
//新内容通知
export const MQTT_CONTENT_NOTIFY = 'mqttContentNotify'
//服务器抓取照片通知
export const MQTT_SNAPSHOT_NOTIFY = 'mqttSnapshotNotify'

export class MQTTDispatcher {
  private client: any

  connect(): void {
    if (this.client === undefined || !this.client.connected) {
      this.client = connect(mqttServer)
      this.client.on('connect', () => {
        if (this.onConnect) {
          this.onConnect()
        }
      })
      this.client.on('message', (title: string, message: string) => {
        const jsonObj = JSON.parse(message)
        console.log('receive message', jsonObj)
      })
    }
  }

  subscrible(messageId: string, deviceId: string): void {
    this.client.subscrible(`${messageId}/${deviceId}`, (err: any) => {
      if (err) {
        console.log('err', err)
      }
    })
  }

  contentPub(deviceId: string, data: any) {
    const jsonString = JSON.stringify({
      deviceId: deviceId,
      ...data,
    })
    this.client.publish(`${MQTT_CONTENT_NOTIFY}/${deviceId}`, jsonString)
  }

  onConnect: (() => void) | undefined
}
