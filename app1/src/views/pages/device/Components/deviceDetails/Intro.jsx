import React, {useRef, useState} from "react";
import resources from "../../locale";
import GR from "~/locale";
import {useHistory} from "react-router-dom";
import {SimpleCard} from '~/views/Components/Cards/Card'
import Dialog from "../../../Components/Modals/Dialog";
import InputDialog from "~/views/Components/Modals/InputDialog";
import {deviceUpdateName, latlngUpdate} from '../../actions'
import {useDispatch} from "react-redux";
import MapAddMarker from './mapAddMarker'

//设备信息
export default(props) => {
  let history = useHistory();
  if (!props.deviceInfo) {
    history.push("/device/details");
    return;
  }
  const {
    deviceId,
    name,
    os,
    resolution,
    ip,
    value,
    latLng // format:lat,lng
  } = props.deviceInfo;
  console.log('latLng',latLng)
  const dialog = useRef(null);
  let position = null;
  if (latLng) {
    const arr = latLng.split(',')
    position = {
      lat: arr[0],
      lng: arr[1]
    }
  }
  const dispatch = useDispatch();

  const setMap = () => {
    dialog
      .current
      .show({
        body: (<MapAddMarker position={position} onMarkerUpdate={(pos) => position = pos}/>),
        actions: [
          Dialog.CancelAction(() => {}),
          Dialog.OKAction(() => {
            dispatch(latlngUpdate(deviceId, `${position.lat},${position.lng}`))
          })
        ],
        onHide: (dialog) => {
          dialog.hide();
        }
      })
  }
  const updateResolution = () => {
    //dialog.current.show({

    var newResolution = resolution;

    dialog
      .current
      .show({
        // title: resources.info,
        body: (<InputDialog
          label={GR.resolution}
          value={resolution}
          inputchange={(val) => {
          newResolution = val;
        }}/>),
        actions: [
          Dialog.CancelAction(() => {
            //console.log("dialog cancel");
          }),
          Dialog.OKAction(() => {

            //if (newResolution === resolution) return;
            dispatch(deviceUpdateName(deviceId, '', newResolution));

            //dialog end
          })
        ],
        onHide: (dialog) => {
          dialog.hide();
        }
      });
  }

  return (
    <SimpleCard title={resources.deviceDetail}>
      <Dialog ref={dialog}/>
      <div className="row">
        <div className="col">
          {GR.name}: {name}
        </div>
        <div className="col">
          {GR.OS}: {os}
        </div>
        <div className="col">
          {GR.resolution}:
          <button className="btn btn-link" onClick={() => updateResolution()}>{resolution || '-'}</button>
        </div>
        <div className="col">
          {GR.ip}: {ip}
        </div>
      </div>
      <div className="row">
        <div className="col">
          {resources.connectionStatus}: {value === 1
            ? GR.online
            : GR.offline}
        </div>
        {/* <div className="col">{resources.boardStatus}:{' '}{boardStatus}</div> */}
        <div className="col">
          <button className="btn btn-primary" onClick={() => setMap(deviceId)}>
            {resources.setMap}
          </button>
        </div>
        <div className="col"></div>
        <div className="col"></div>
      </div>
    </SimpleCard>
  );
};
