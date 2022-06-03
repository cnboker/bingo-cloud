import axios from 'axios'
import {
  RECEIVE_DEVICE_LIST,
  RECEIVE_DEVICE_STATUS_LIST,
  RECEIVE_DOWNLOAD_PROGRESS_UPDATE,
  RECEIVE_DEVICE_UPDATE_NAME,
  RECEIVE_UPDATE_LICENSE,
  RECEIVE_UPDATE_GROUP,
  RECEIVE_DEVICE_SELECT,
  RECEIVE_DEVICE_SNAPSHOT_IMAGE,
  RECEIVE_DEVICE_LOGS,
  RECEIVE_DEVICE_STATUS,
} from './constants'
import * as Dialog from '~/views/components/dialog/Index'
import { authHeader } from '~/lib/check-auth'

export const receiveDeviceList = (payload) => {
  return { type: RECEIVE_DEVICE_LIST, payload }
}

export const receiveDeviceLogs = (payload) => {
  return { type: RECEIVE_DEVICE_LOGS, payload }
}

export const receiveDeviceSnapshot = (payload) => {
  return { type: RECEIVE_DEVICE_SNAPSHOT_IMAGE, payload }
}

export const redeviceDeviceStatus = (payload) => {
  return { type: RECEIVE_DEVICE_STATUS_LIST, payload }
}

export const receiveDownloadProgress = (payload) => {
  return { type: RECEIVE_DOWNLOAD_PROGRESS_UPDATE, payload }
}

export const receiveDeviceUpdateName = (payload) => {
  return { type: RECEIVE_DEVICE_UPDATE_NAME, payload }
}

export const receiveRenewLicense = (payload) => {
  return { type: RECEIVE_UPDATE_LICENSE, payload }
}

export const receiveGroupUpdate = (payload) => {
  return { type: RECEIVE_UPDATE_GROUP, payload }
}

export const receiveDeviceSelected = (payload) => {
  return { type: RECEIVE_DEVICE_SELECT, payload }
}

export const receiveDeviceStatus = (payload) => {
  return {
    type: RECEIVE_DEVICE_STATUS,
    payload,
  }
}

export const requestDeviceStatus = () => (dispatch) => {
  var url = `${process.env.REACT_APP_SERVICE_URL}/api/device/status`
  var headers = authHeader()
  axios({
    url,
    method: 'get',
    headers,
  }).then((resp) => {
    dispatch(receiveDeviceStatus(resp.data))
  })
}
export const requestDeviceList = (username) => (dispatch) => {
  var headers = authHeader()
  var url = `${process.env.REACT_APP_SERVICE_URL}/api/device/list/${username}`
  axios({ url, method: 'get', headers }).then((resp) => {
    dispatch(receiveDeviceList(resp.data))
  })
}

export const getDeviceLogs = (parameters) => (dispatch) => {
  var str = ''
  for (var key in parameters) {
    if (str !== '') {
      str += '&'
    }
    str += key + '=' + encodeURIComponent(parameters[key])
  }
  var headers = authHeader()
  var url = `${process.env.REACT_APP_SERVICE_URL}/api/log?${str}`
  axios({ url, method: 'get', headers }).then((resp) => {
    dispatch(receiveDeviceLogs(resp.data))
  })
}

export const getDeviceSnapshot = (deviceId) => (dispatch) => {
  var headers = authHeader()
  var url = `${process.env.REACT_APP_SERVICE_URL}/api/screenshot/${deviceId}`
  axios({ url, method: 'get', headers }).then((resp) => {
    dispatch(receiveDeviceSnapshot(resp.data))
  })
}

export const renewLicense = (deviceId) => (dispatch) => {
  var headers = authHeader()
  var url = `${process.env.REACT_APP_SERVICE_URL}/api/license/authorize`
  //axio push
  axios({ url, method: 'post', headers, data: { deviceId } })
    .then((res) => {
      dispatch(receiveRenewLicense(res.data))
    })
    .catch((e) => {
      if (e.response) {
        Dialog.toast(e.response.data)
      } else if (e.message) {
        Dialog.toast(e.message)
      }
    })
}

export const latlngUpdate = (deviceId, latlng) => (dispatch) => {
  var headers = authHeader()
  var url = `${process.env.REACT_APP_SERVICE_URL}/api/device/updateName`
  //axio push
  axios({
    url,
    method: 'post',
    data: {
      deviceId,
      latlng,
    },
    headers,
  })
    .then((response) => {
      // console.log("update device name success"); dispatch(receiveDeviceUpdateName({
      // deviceId, newName, resolution}));
      console.log('latlngUpdate', response)
    })
    .catch((err) => {
      console.log(err)
    })
}

//update device name or resolution, 不更新的赋值''
export const deviceUpdateName = (deviceId, newName, resolution) => (dispatch) => {
  var headers = authHeader()
  var url = `${process.env.REACT_APP_SERVICE_URL}/api/device/updateName`
  //axio push
  axios({
    url,
    method: 'post',
    data: {
      deviceId,
      newName,
      resolution,
    },
    headers,
  })
    .then((res) => {
      console.log('deviceUpdateName', res)
      dispatch(receiveDeviceUpdateName({ deviceId, newName, resolution }))
    })
    .catch((err) => {
      console.log(err)
    })
}

//update device group
export const deviceGroupUpdate = (deviceId, groupName) => (dispatch) => {
  var headers = authHeader()
  var url = `${process.env.REACT_APP_SERVICE_URL}/api/device/groupUpdate`
  //axio push
  axios({
    url,
    method: 'post',
    data: {
      deviceId,
      groupName,
    },
    headers,
  })
    .then(() => {
      //console.log("update device name success");
      dispatch(receiveGroupUpdate({ deviceId, groupName }))
    })
    .catch((err) => {
      console.log(err)
    })
}

export const deviceSelected = (deviceId, selected) => (dispatch) => {
  dispatch(receiveDeviceSelected({ deviceId, selected }))
}
