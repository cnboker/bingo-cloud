import React, { useEffect } from 'react'
import { Card } from '~/views/components/widgets/Card'
import { spanshotPub } from 'src/views/pages/mqtt/mqttApi'
import { requestSnapshot } from '../../actions'
import { useSelector } from 'react-redux'

export default ({ deviceId }) => {
  const devicelist = useSelector((state) => state.deviceListReducer)
  const curDevice = devicelist[deviceId]

  useEffect(() => {
    const interval = setInterval(() => {
      //mqtt 请求截屏
      spanshotPub(deviceId)
      requestSnapshot()
    }, 10000)
    return () => {
      requestSnapshot()
      clearInterval(interval)
    }
  }, [])

  if (!curDevice || !curDevice.spanshotImageObject) {
    return <>no data</>
  }
  return (
    <>
      <Card>
        <img
          style={{ width: '800px' }}
          alt="screen scrap"
          src={`${curDevice.spanshotImageObject}`}
        />
      </Card>
    </>
  )
}
