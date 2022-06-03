import { useDispatch } from 'react-redux'
import { MQTTDispatcher } from './MQTTDispatcher'
import { receiveDownloadProgress } from './actions'
const disp = new MQTTDispatcher()

//内容发布消息
export const contentPublish = (deviceIds: string[], fileList: string[]) => {
  disp.onConnect = () => {
    for (const deviceId of deviceIds) {
      disp.contentPub(deviceId, fileList)
    }
  }
  disp.connect()
}

export const spanshotPub = (deviceId: string) => {
  disp.onConnect = () => {
    console.log('spanshotPub...', deviceId)
    disp.spanshotPub(deviceId)
  }
  disp.connect()
}

//订阅文件下载进度
export const usedownloadProgressEvent = () => {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const dispatch = useDispatch()
  disp.connect()
  return () => {
    disp.DownloadProgress = (message) => {
      console.log('downloadProgress', message)
      dispatch(receiveDownloadProgress())
    }
  }
}
