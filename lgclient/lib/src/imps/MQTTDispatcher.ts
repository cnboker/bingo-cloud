import { connect } from "mqtt";
//
//文件下载进度
export const MQTT_DOWNLOAD_PROGRESS = 'mqttDownloadProgress'
//新内容通知
export const MQTT_CONTENT_NOTIFY = 'mqttContentNotify'
//服务器抓取照片通知
export const MQTT_SNAPSHOT_NOTIFY = 'mqttSnapshotNotify'

var client: any;

export const mqttDownloadProgressPublish = (deviceId: string, data: any) => {
  if (client.connected) {
    var jsonString = JSON.stringify({
      deviceId: deviceId,
      ...data
    });
    console.log(`${MQTT_DOWNLOAD_PROGRESS}/${deviceId}`, jsonString)
    client.publish(`${MQTT_DOWNLOAD_PROGRESS}/${deviceId}`, jsonString);
  } else {
    console.warn('client disconnected or not call mqttConnect!')
  }
}

export const mqttSubscrible = (deviceId: string, key: string) => {
  if (client.connected) {
    client.subscrible(`${key}/${deviceId}`, (err: any) => {
      if (err) {
        console.log('err', err)
      }
    })
  }
}


export const mqttConnect = (mqttServer: string, onMessage?: (topic: string, message: string) => void) => {
  if (client === undefined || !client.connected) {
    client = connect(mqttServer);
  }
  client.on('message', onMessage)
}