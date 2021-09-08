import { all, call, put, takeLatest } from "redux-saga/effects";
import { ResponseHandle } from "../../utils/ResponseHandle";
import Cookies from "js-cookie";
import { DEVICE_RUNNING_REQUESTING } from "./constants";
import { deviceRunningSuccess, deviceRunningFailure } from "./actions";
var auth = require("../../lib/check-auth");

const deviceRunningUrl = `${process.env.REACT_APP_ORDER_URL}/api/device/getall/`;

function deviceRunningApi(userName) {
  //console.log("deviceRunningApi")
  var url =
    deviceRunningUrl + userName + "?culture=" + (Cookies.get("language") || "zh");
  return fetch(url, {
    method: "GET",
    headers: auth.authHeader(),
    //body: JSON.stringify({ deviceId })
  })
    .then(ResponseHandle)
    .catch((error) => {
      throw error;
    });
}

function statusResourceApi(statusResourceUrl) {
  //console.log(`statusResourceUrl:${statusResourceUrl}`)
  return fetch(statusResourceUrl, {
    method: "GET",
    headers: auth.authHeader(),
    //body: JSON.stringify({ deviceId })
  })
    .then(ResponseHandle)
    .catch((error) => {
      throw error;
    });
}

function* deviceRunningFlow(action) {
  try {
    const { userName } = action;
    const response = yield call(deviceRunningApi, userName);
    //console.log('deviceRunningFlow response', response)
    //yield put(deviceRunningSuccess(response));
    if (response.length > 0) {
      const statusResourceUrl = response[0].statusResourceUrl;
      if(statusResourceUrl){
        const response2 = yield call(statusResourceApi, statusResourceUrl);
        const res = response.map((x) =>
          Object.assign(
            x,
            response2.find((y) => y.deviceId === x.deviceId)||{}
          )
        );
        yield put(deviceRunningSuccess(res));
      }else{
        yield put(deviceRunningSuccess(response))
      }
      
      //console.log('deviceRunning=', response, res)
      
    }
  } catch (error) {
    yield put(deviceRunningFailure(error));
  }
}

function* deviceRunningWather() {
  yield all([takeLatest(DEVICE_RUNNING_REQUESTING, deviceRunningFlow)]);
}

export default deviceRunningWather;
