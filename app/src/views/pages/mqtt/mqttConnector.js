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

//更新reducer入口 deviceId is array type
// export const deviceMQTTSubscrible = (deviceIds) => (dispatch) => {
//   var connector = MQTTConnector.instance()

//   connector.onMessage((topic, message) => {
//     var jsonObj = JSON.parse(message)
//     if (topic.indexOf('LGDownloadProgress/') !== -1) {
//       // console.log("json parse", topic, jsonObj);
//       dispatch(receiveDownloadProgress(jsonObj))
//     } else if (topic.indexOf('LGBeatHeart/') !== -1) {
//       dispatch(receiveStatusUpdate(jsonObj))
//     }
//   })
//   for (var id of deviceIds) {
//     connector.beatHeartSubscrible(id)
//     connector.downloadProgressSubscrible(id)
//   }
// }
