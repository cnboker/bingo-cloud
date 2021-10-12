import axios from "axios";
import { uuidv4 } from "../lib/util";
const qs = require("querystring");

export const requestQR = () => {
  var url = `${process.env.REACT_APP_AUTH_URL}/api/authSession`;
  var sessionId = uuidv4().replace(/-/g, "");
  return axios({
    url,
    method: "post",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    data: qs.stringify({ sessionId })
  });
};

export const requestToken = sessionId => {
  var url = `${process.env.REACT_APP_AUTH_URL}/api/crossToken/${sessionId}`;

  return axios({ url, method: "get" });
};

export const postDeviceInfo = (
  token,
  mac,
  name,
  ip,
  os,
  resolution,
  authorizeCode
) => {
  var url = `${process.env.REACT_APP_MEMBER_URL}/api/License/UploadDeviceInfo`;

  return axios({
    url,
    method: "post",
    data: qs.stringify({
      deviceId: mac,
      mac,
      name,
      os,
      resolution,
      ip,
      authorizeCode
    }),
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Bearer ${token}`
    }
  });
};
//设备注册
export const register = (token,url, mac, name, ip, os, resolution) => {
  //var url = `${process.env.REACT_APP_MEMBER_URL}/api/License/UploadDeviceInfo`;

  return axios({
    url,
    method: "post",
    data: qs.stringify({
      key: mac,
      mac,
      name,
      os,
      resolution,
      ip
    }),
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Bearer ${token}`
    }
  });
};

//key:deviceId
export const requestLicense = (token, key) => {
  var url = `${process.env.REACT_APP_MEMBER_URL}/api/requestLicense/${key}`;
  return axios({
    url,
    method: "get",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
};

export const requestInstance = (token) => {
  var url = `${process.env.REACT_APP_MEMBER_URL}/api/instance`;
  return axios({
    url,
    method: "get",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
};

