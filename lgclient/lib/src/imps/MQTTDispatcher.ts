import { connect, MqttClient } from "mqtt";
import { ContentPackage } from "../dataModels/ContentPackage";
import { IMQTTDispatcher } from "../interfaces/IMQTTDispatcher";
//
//文件下载进度
export const MQTT_DOWNLOAD_PROGRESS = 'mqttDownloadProgress'
//新内容通知
export const MQTT_CONTENT_NOTIFY = 'mqttContentNotify'
//服务器抓取照片通知
export const MQTT_SNAPSHOT_NOTIFY = 'mqttSnapshotNotify'


export class MQTTDispatcher implements IMQTTDispatcher {
  private client: MqttClient;
  private deviceId: string;

  connect(server: string, deviceId: string): void {
    this.deviceId = deviceId;
    console.log('mqttDispatcher', server, deviceId)
    if (this.client === undefined || !this.client.connected) {
      this.client = connect(server);
    }
    const self = this;
    this.client.on('connect', () => {
      console.log('mqtt connected...')
      self.subscrible(MQTT_CONTENT_NOTIFY);
      self.subscrible(MQTT_SNAPSHOT_NOTIFY);
    })
    this.client.on('message', (title: string, message: any) => {
      console.log('mqtt message', title, String.fromCharCode(message))
      var jsonObj = JSON.parse(message)
      if (title === `${MQTT_CONTENT_NOTIFY}/${this.deviceId}`) {
        this.onSubContentNotify(jsonObj);
      } else if (title === `${MQTT_SNAPSHOT_NOTIFY}/${this.deviceId}`) {
        this.onSubSnapshotNotify();
      }
    })
  }

  private subscrible(messageId: string): void {
    this.client.subscribe(`${messageId}/${this.deviceId}`, (err: any) => {
      if (err) {
        console.log('err', err)
      }
    })
  }

  pubDownloadProgress(data: any) {
    var jsonString = JSON.stringify({
      deviceId: this.deviceId,
      ...data
    });
    this.client.publish(`${MQTT_DOWNLOAD_PROGRESS}/${this.deviceId}`, jsonString);
  }
  //callback
  onSubContentNotify: (data: ContentPackage) => void;
  onSubSnapshotNotify: () => void;
}
