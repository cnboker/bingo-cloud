import React, { useRef, useState } from 'react'
import resources from '../../locale'
import GR from '~/locale'
import { CContainer } from '@coreui/react'
import { useDispatch } from 'react-redux'
//import MapAddMarker from './mapAddMarker'
import { CFormLabel } from '@coreui/react'
//设备信息
export default (props) => {
  const {
    deviceId,
    name,
    os,
    resolution,
    ip,
    value,
    latLng, // format:lat,lng
  } = props.deviceInfo

  let position = null
  if (latLng) {
    const arr = latLng.split(',')
    position = {
      lat: arr[0],
      lng: arr[1],
    }
  }
  const dispatch = useDispatch()

  // const setMap = () => {
  //   dialog.current.show({
  //     body: <MapAddMarker position={position} onMarkerUpdate={(pos) => (position = pos)} />,
  //     actions: [
  //       Dialog.CancelAction(() => {}),
  //       Dialog.OKAction(() => {
  //         dispatch(latlngUpdate(deviceId, `${position.lat},${position.lng}`))
  //       }),
  //     ],
  //     onHide: (dialog) => {
  //       dialog.hide()
  //     },
  //   })
  // }

  return (
    <CContainer className="px-4 bt-4">
      <div className="row">
        <div className="col">
          <CFormLabel>{GR.name}: </CFormLabel>
          {name}
        </div>
        <div className="col">
          {GR.OS}: {os}
        </div>
        <div className="col">{GR.resolution}:</div>
        <div className="col">
          {GR.ip}: {ip}
        </div>
      </div>
      <div className="row">
        <div className="col">
          {resources.connectionStatus}: {value === 1 ? GR.online : GR.offline}
        </div>
        {/* <div className="col">
          <button className="btn btn-primary" onClick={() => setMap(deviceId)}>
            {resources.setMap}
          </button>
        </div> */}
        <div className="col"></div>
        <div className="col"></div>
      </div>
    </CContainer>
  )
}
