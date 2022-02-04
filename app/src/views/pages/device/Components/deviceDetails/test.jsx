import React from 'react'
import MapAddMarker from './mapAddMarker'

export default(props) => {
  const deviceId = "0800271048F5";
  const onMarkerUpdate = (pos) => {
    console.log('marker triger', pos)
  }
  return (<MapAddMarker position={{lat: 22.713173152355225, lng: 114.27824020385742}} onMarkerUpdate={(pos) => onMarkerUpdate(pos)}/>)
}