import { connect } from 'mqtt'
const mqttServer = process.env.REACT_APP_MQTT_URL

//监控数字标牌下载进度
export default class MQTTConnector {
  static instance() {
    if (!!MQTTConnector._instance) {
      return MQTTConnector._instance
    }
    var _instance = new MQTTConnector()
    MQTTConnector._instance = _instance
    _instance.client = connect(mqttServer)

    _instance.client.on('message', function (topic, message) {
      // message is Buffer
      console.log(topic, message.toString())
      if (_instance.messageTrigger) {
        _instance.messageTrigger(topic, message)
      }
    })

    return MQTTConnector._instance
  }

  onMessage(messageTrigger) {
    this.messageTrigger = messageTrigger
  }

  downloadProgressSubscrible(deviceId) {
    console.log('downloadProgressSubscrible', deviceId)
    this.client.subscribe(`LGDownloadProgress/${deviceId}`, function (err) {
      if (err) {
        console.log('err', err)
      }
    })
  }

  beatHeartSubscrible(deviceId) {
    this.client.subscribe(`LGBeatHeart/${deviceId}`, function (err) {
      if (err) {
        console.log('err', err)
      }
    })
  }
}
