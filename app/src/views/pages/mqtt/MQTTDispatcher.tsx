import { connect, MqttClient } from 'mqtt'
import {
  DownloadResult,
  MQTT_CONTENT_NOTIFY,
  MQTT_DOWNLOAD_PROGRESS,
  MQTT_SNAPSHOT_NOTIFY,
} from './contants'
const mqttServer = process.env.REACT_APP_MQTT_URL

export class MQTTDispatcher {
  private client: MqttClient
  DownloadProgress: (message: DownloadResult) => void
  onConnect: (() => void) | undefined
  connect(): void {
    if (this.client && this.client.connected) {
      this.onConnect && this.onConnect()
    } else if (this.client === undefined || !this.client.connected) {
      this.client = connect(mqttServer)
      this.client.on('connect', () => {
        this.onConnect && this.onConnect()
      })
      this.client.on('message', (title: string, message: string) => {
        const jsonObj = JSON.parse(message)
        console.log('receive message', jsonObj)
        if (title.indexOf(MQTT_DOWNLOAD_PROGRESS) >= 0) {
          this.DownloadProgress && this.DownloadProgress(jsonObj)
        }
      })
    }
  }

  subscribe(messageId: string, deviceId: string): void {
    this.client.subscribe(`${messageId}/${deviceId}`, (err: any) => {
      if (err) {
        console.log('err', err)
      }
    })
  }

  //发布内容消息到设备
  contentPub(deviceId: string, data: any) {
    if (!deviceId) return
    const jsonString = JSON.stringify({
      deviceId: deviceId,
      files: data,
    })
    console.log('mqtt pub:', `${MQTT_CONTENT_NOTIFY}/${deviceId}`, jsonString)
    this.client.publish(`${MQTT_CONTENT_NOTIFY}/${deviceId}`, jsonString)
  }

  //发布截图消息到设备
  spanshotPub(deviceId: string) {
    this.client.publish(`${MQTT_SNAPSHOT_NOTIFY}/${deviceId}`, `{}`)
  }
}
