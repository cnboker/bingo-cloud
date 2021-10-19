import * as api from "./api";
//import {toast} from "react-toastify";

export const RECEIVE_QR = "RECEIVE_QR";
export const RECEIVE_TOKEN = "RECEIVE_TOKEN";
export const RECEIVE_LICENSE = "RECEIVE_LICENSE";
export const RECEIVE_INSTANCE = "RECEIVE_INSTANCE";

export const receiveQR = payload => {
    return { type: RECEIVE_QR, payload };
};


export const receiveToken = payload => {
    return { type: RECEIVE_TOKEN, payload };
};

export const receiveLicense = payload => {
    return { type: RECEIVE_LICENSE, payload };
};

export const receiveInstance = payload => {
    return { type: RECEIVE_INSTANCE, payload };
};

//-------------------function

export const requestQR = () => dispatch => {
    api.requestQR().then(response => {
        dispatch(receiveQR(response.data));
    });
};

export const requestToken = authorizeCode => dispatch => {
    api.requestToken(authorizeCode).then(response => {
        dispatch(receiveToken(response.data));
    });
};

export const postDeviceInfo =  (
    token,
    authorizeCode,
    deviceInfo
) => dispatch =>{
    api
        .postDeviceInfo(token,authorizeCode,deviceInfo)
        .then(response => {
            //dispatch(recevie)
        });
};

//key:deviceId
export const requestLicense = (token,key) => dispatch =>{
    api.requestLicense(token,key).then(response => {
        dispatch(receiveLicense(response.data));
    });
};

export const requestInstance = (token) => dispatch =>{
    api.requestInstance(token).then(response => {
        dispatch(receiveInstance(response.data));
    });
};
