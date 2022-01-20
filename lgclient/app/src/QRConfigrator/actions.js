import * as api from "./api";
//import {toast} from "react-toastify";

export const RECEIVE_QR = "RECEIVE_QR";
export const RECEIVE_TOKEN = "RECEIVE_TOKEN";
export const RECEIVE_CONFIG = "RECEIVE_CONFIG";
export const RECEIVE_INSTANCE = "RECEIVE_INSTANCE";

export const receiveQR = (payload) => {
  return { type: RECEIVE_QR, payload };
};

export const receiveToken = (payload) => {
  return { type: RECEIVE_TOKEN, payload };
};

export const receiveConfig = (payload) => {
  return { type: RECEIVE_CONFIG, payload };
};

export const receiveInstance = (payload) => {
  return { type: RECEIVE_INSTANCE, payload };
};

export const requestQR = () => (dispatch) => {
  api
    .requestQR()
    .then((response) => {
      dispatch(receiveQR(response.data));
    })
    .catch((e) => console.log(e));
};

export const requestToken = (authorizeCode) => (dispatch) => {
  api
    .requestToken(authorizeCode)
    .then((response) => {
      dispatch(receiveToken(response.data));
    })
    .catch((e) => console.log(e));
};

export const postDeviceInfo =
  (token, authorizeCode, deviceInfo) => (dispatch) => {
    api.postDeviceInfo(token, authorizeCode, deviceInfo).then((response) => {
      //dispatch(recevie)
    });
  };

//key:deviceId
export const requestConfig = (token, key) => (dispatch) => {
  api.requestConfig(token, key).then((response) => {
    dispatch(receiveConfig(response.data));
  });
};

export const requestInstance = (token) => (dispatch) => {
  api.requestInstance(token).then((response) => {
    dispatch(receiveInstance(response.data));
  });
};
