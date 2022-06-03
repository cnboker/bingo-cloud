import React, { useEffect } from 'react'
import { Card } from '~/views/components/widgets/Card'
import G from '~/locale'
import { spanshotPub } from 'src/views/pages/mqtt/mqttApi'
import { getDeviceSnapshot } from '../../actions'
import { useSelector } from 'react-redux'

export default ({ deviceId }) => {
  const devicelist = useSelector((state) => state.deviceListReducer)
  const curDevice = devicelist[deviceId]

  useEffect(() => {
    const interval = setInterval(() => {
      //mqtt 请求截屏
      spanshotPub(deviceId)
      getDeviceSnapshot()
    }, 10000)
    return () => clearInterval(interval)
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
