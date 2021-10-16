import React, {useEffect, useState} from 'react'
import JSONPretty from 'react-json-pretty';
import {webosApis} from 'lgservice'

export default() => {
  const {queryDeviceInfo, queryosInfo} = webosApis.systemservice
  const [deviceInfo,
    setDeviceInfo] = useState({})
  const [osInfo,
    setOsInfo] = useState({})

  useEffect(() => {
    queryDeviceInfo().then(res => {
      setDeviceInfo(res)
      return queryosInfo()
    })
    .then(res => {
      setOsInfo(res)
    })
  }, [])

  return (
    <React.Fragment>
      <h3>deviceInfo</h3>
      <JSONPretty id="deviceInfo" data={deviceInfo}></JSONPretty>
      <h3>osInfo</h3>
      <JSONPretty id="osInfo" data={osInfo}></JSONPretty>
    </React.Fragment>
  )
}