import axios from "axios";
import {
  DEVICE_RUNNING_REQUESTING,
  REQUEST_DEVICE_LIST_SUCCESS,
  DEVICE_RUNNING_FAILED,
  RECEIVE_DEVICE_STATUS_UPDATE,
  RECEIVE_DOWNLOAD_PROGRESS_UPDATE,
  RECEIVE_DEVICE_UPDATE_NAME,
  RECEIVE_DEVICE_UPDATE_SENSOR,
  RECEIVE_UPDATE_LICENSE,
  RECEIVE_UPDATE_GROUP,
  RECEIVE_DEVICE_SELECT,
  RECEIVE_DEVICE_VM_DELETE,
  RECEIVE_DEVICE_SNAPSHOT_IMAGE,
  RECEIVE_DEVICE_LOGS,
} from "./constants";
import { toast } from "react-toastify";
import MQTTConnector from "./mqttConnector";
var auth = require("../../lib/check-auth");

export const deviceListRequest = (userName) => {
  return { type: DEVICE_RUNNING_REQUESTING, userName };
};

export const vmDeleteReceive = (id) => {
  return { type: RECEIVE_DEVICE_VM_DELETE, id };
};

export const deviceLogsReceive = (payload) => {
  return { type: RECEIVE_DEVICE_LOGS, payload };
};

export const deviceSnapshotReceive = (payload) => {
  return { type: RECEIVE_DEVICE_SNAPSHOT_IMAGE, payload };
};

export const getDeviceLogs = (serverUrl,parameters) => (dispatch) => {
  var str = "";
  for (var key in parameters) {
    if (str !== "") {
      str += "&";
    }
    str += key + "=" + encodeURIComponent(parameters[key]);
  }
  var headers = auth.authHeader();
  var url = `${serverUrl}api/log?${str}`;
  axios({
    url,
    method: "get",
    headers,
  }).then((resp) => {
    dispatch(deviceLogsReceive(resp.data));
  });
};

export const getDeviceSnapshot = (serverUrl, deviceId) => (dispatch) => {
  var headers = auth.authHeader();
  var url = `${serverUrl}api/screenshot/${deviceId}`;
  axios({
    url,
    method: "get",
    headers,
  }).then((resp) => {
    dispatch(deviceSnapshotReceive(resp.data));
  });
};

export const deleteVMDevice = (id) => (dispatch) => {
  var headers = auth.authHeader();
  var url = `${process.env.REACT_APP_ORDER_URL}/api/device/vmdelete/${id}`;
  axios({
    url,
    method: "delete",
    headers,
  }).then((resp) => {
    dispatch(vmDeleteReceive(id));
  });
};

export const createVMRequest = (quantity) => (dispatch) => {
  var headers = auth.authHeader();
  var url = `${process.env.REACT_APP_ORDER_URL}/api/device/vmCreate`;
  axios({
    url,
    method: "post",
    data: { quantity },
    headers,
  }).then((resp) => {
    dispatch(deviceRunningSuccess(resp.data));
  });
};

export const deviceRunningSuccess = (payload) => {
  return { type: REQUEST_DEVICE_LIST_SUCCESS, payload };
};

export const deviceRunningFailure = (error) => {
  return { type: DEVICE_RUNNING_FAILED, error };
};

export const receiveStatusUpdate = (payload) => {
  return { type: RECEIVE_DEVICE_STATUS_UPDATE, payload };
};

export const receiveDownloadProgress = (payload) => {
  return { type: RECEIVE_DOWNLOAD_PROGRESS_UPDATE, payload };
};

export const receiveDeviceUpdateName = (payload) => {
  return { type: RECEIVE_DEVICE_UPDATE_NAME, payload };
};

export const receiveDeviceUpdateSensor = (payload) => {
  return { type: RECEIVE_DEVICE_UPDATE_SENSOR, payload };
};

export const receiveUpdateLicense = (payload) => {
  return { type: RECEIVE_UPDATE_LICENSE, payload };
};

export const receiveGroupUpdate = (payload) => {
  return { type: RECEIVE_UPDATE_GROUP, payload };
};

export const receiveDeviceSelected = (payload) => {
  return { type: RECEIVE_DEVICE_SELECT, payload };
};
//更新reducer入口 deviceId is array type
export const deviceMQTTSubscrible = (deviceIds) => (dispatch) => {
  var connector = MQTTConnector.instance();

  connector.onMessage((topic, message) => {
    var jsonObj = JSON.parse(message);
    if (topic.indexOf("LGDownloadProgress/") !== -1) {
      // console.log("json parse", topic, jsonObj);
      dispatch(receiveDownloadProgress(jsonObj));
    } else if (topic.indexOf("LGBeatHeart/") !== -1) {
      dispatch(receiveStatusUpdate(jsonObj));
    }
  });
  for (var id of deviceIds) {
    connector.beatHeartSubscrible(id);
    connector.downloadProgressSubscrible(id);
  }
};

export const updateLicense = (userName, deviceId) => (dispatch) => {
  var headers = auth.authHeader();
  var url = `${process.env.REACT_APP_ORDER_URL}/api/device/getall/${userName}`;
  //axio push
  axios({ url, method: "get", headers })
    .then((response) => {
      var info = response.data.filter((x) => x.deviceId === deviceId).shift();
      dispatch(receiveUpdateLicense(info));
    })
    .catch((err) => {
      toast.error(err, { position: toast.POSITION.BOTTOM_CENTER });
      console.log(err);
    });
};

export const latlngUpdate = (deviceId, latlng) => (dispatch) => {
  var headers = auth.authHeader();
  var url = `${process.env.REACT_APP_ORDER_URL}/api/device/updateName`;
  //axio push
  axios({
    url,
    method: "post",
    data: {
      deviceId,
      latlng
    },
    headers,
  })
    .then((response) => {
      //console.log("update device name success");
      //dispatch(receiveDeviceUpdateName({ deviceId, newName, resolution}));
    })
    .catch((err) => {
      console.log(err);
    });
};


//update device name or resolution, 不更新的赋值''
export const deviceUpdateName = (deviceId, newName,resolution) => (dispatch) => {
  var headers = auth.authHeader();
  var url = `${process.env.REACT_APP_ORDER_URL}/api/device/updateName`;
  //axio push
  axios({
    url,
    method: "post",
    data: {
      deviceId,
      newName,
      resolution
    },
    headers,
  })
    .then((response) => {
      //console.log("update device name success");
      dispatch(receiveDeviceUpdateName({ deviceId, newName, resolution}));
    })
    .catch((err) => {
      console.log(err);
    });
};

//update device group
export const deviceGroupUpdate = (deviceId, groupName) => (dispatch) => {
  var headers = auth.authHeader();
  var url = `${process.env.REACT_APP_ORDER_URL}/api/device/groupUpdate`;
  //axio push
  axios({
    url,
    method: "post",
    data: {
      deviceId,
      groupName,
    },
    headers,
  })
    .then((response) => {
      //console.log("update device name success");
      dispatch(receiveGroupUpdate({ deviceId, groupName }));
    })
    .catch((err) => {
      console.log(err);
    });
};

export const deviceUpdateSensor = (deviceId, sensorNo) => (dispatch) => {
  var url = `${process.env.REACT_APP_ORDER_URL}/api/device/addOrUpdateSenser`;
  var headers = auth.authHeader();
  axios({
    url: url,
    method: "post",
    data: {
      deviceId,
      sensorNo,
    },
    headers,
  })
    .then((response) => {
      //console.log("set sensor ok");
      dispatch(receiveDeviceUpdateSensor({ deviceId, sensorNo }));
    })
    .catch((err) => {
      console.log(err);
    });
};

export const deviceSelected = (deviceId, selected) => (dispatch) => {
  dispatch(receiveDeviceSelected({ deviceId, selected }));
};
