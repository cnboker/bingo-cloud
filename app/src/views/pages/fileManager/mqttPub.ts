import { MQTTDispatcher } from '../mqtt/MQTTDispatcher'
const disp = new MQTTDispatcher()

export const mqttPub = (deviceIds: string[], fileList: string[]) => {
  disp.connect()
  disp.onConnect = () => {
    for (const deviceId of deviceIds) {
      disp.contentPub(deviceId, fileList)
    }
  }
}
