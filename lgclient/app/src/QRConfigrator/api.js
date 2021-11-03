import axios from "axios";
import { uuidv4 } from "../lib/util";
import { webosApis } from "lgservice";
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

export const getDeviceInfo = async() => {
    const { queryDeviceInfo, queryosInfo } = webosApis.systemservice;
    const deviceInfo = await queryDeviceInfo();
    const osInfo = await queryosInfo();
    const { wired_addr, bt_addr, wifi_addr, returnValue, device_name } = deviceInfo;
    const {
        webos_name, //webOS,OSE
        webos_release
    } = osInfo;
    return {
        wired_addr, bt_addr, //Bluetooth address.
        wifi_addr,
        returnValue,
        device_name,
        webos_name,
        webos_release
    };
};

export const postDeviceInfo = (token, authorizeCode, deviceInfo) => {
    var url = `${process.env.REACT_APP_MEMBER_URL}/api/License/UploadDeviceInfo`;
    const { wired_addr } = deviceInfo;
    return axios({
        url,
        method: "post",
        data: qs.stringify({
            deviceId: wired_addr,
            authorizeCode,
            os: deviceInfo.webos_name,
            os_ver: deviceInfo.webos_release,
            mac: wired_addr,
            name: deviceInfo.device_name
        }),
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Bearer ${token}`
        }
    });
};

//key:deviceId
export const requestConfig = (token) => {
    var url = `${process.env.REACT_APP_MEMBER_URL}/api/requestConfig`;
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
