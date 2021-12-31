import { MQTTDispatcher } from '../mqtt/MQTTDispatcher'
const disp = new MQTTDispatcher()

export const useMqttPub = (deviceIds: string[], fileList: string[]) => {
  disp.connect()
  disp.onConnect = () => {
    for (let deviceId of deviceIds) {
      disp.contentPub(deviceId, fileList)
    }
  }
}
