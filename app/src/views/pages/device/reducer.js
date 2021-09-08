import {
  REQUEST_DEVICE_LIST_SUCCESS,
  RECEIVE_DEVICE_STATUS_UPDATE,
  RECEIVE_DEVICE_UPDATE_SENSOR,
  RECEIVE_DEVICE_UPDATE_NAME,
  RECEIVE_UPDATE_LICENSE,
  RECEIVE_UPDATE_GROUP,
  RECEIVE_DEVICE_SELECT,
  RECEIVE_DEVICE_VM_DELETE,
  RECEIVE_DEVICE_SNAPSHOT_IMAGE,
  RECEIVE_DEVICE_LOGS,
} from "./constants";
import merge from "lodash/merge";

const initialState = [];
var deviceInfo;
export const deviceListReducer = (state = initialState, action) => {
  Object.freeze(state);
  let newState = merge([], state);
  switch (action.type) {
    case REQUEST_DEVICE_LIST_SUCCESS:
      console.log("devicelist", action.payload);
      return action.payload;
    case RECEIVE_DEVICE_STATUS_UPDATE:
      deviceInfo = newState.find((x) => x.deviceId === action.payload.deviceId);
      if (!deviceInfo || deviceInfo.status === action.payload.status) {
        return state;
      }
      deviceInfo.status = action.payload.status;
      return newState;
    case RECEIVE_DEVICE_UPDATE_SENSOR:
      deviceInfo = newState.find((x) => x.deviceId === action.payload.deviceId);
      if (!deviceInfo) {
        return state;
      }
      deviceInfo.sensorNo = action.payload.sensorNo;
      return newState;
    case RECEIVE_DEVICE_UPDATE_NAME:
      deviceInfo = newState.find((x) => x.deviceId === action.payload.deviceId);

      if (!deviceInfo) {
        return state;
      }
      if(action.payload.newName){
        deviceInfo.name = action.payload.newName;
      }
      if(action.payload.resolution){
        deviceInfo.resolution = action.payload.resolution;
      }
      

      return newState;
    case RECEIVE_UPDATE_LICENSE:
      if (action.payload) {
        for (let i = 0; i < newState.length; i++) {
          if (newState[i].deviceId === action.payload.deviceId) {
            newState[i] = action.payload;
            break;
          }
        }
      }
      return newState;
    case RECEIVE_UPDATE_GROUP:
      deviceInfo = newState.find((x) => x.deviceId === action.payload.deviceId);
      deviceInfo.groupName = action.payload.groupName;
      return newState;
    case RECEIVE_DEVICE_SELECT:
      deviceInfo = newState.find((x) => x.deviceId === action.payload.deviceId);
      deviceInfo.selected = action.payload.selected;
      return newState;
    case RECEIVE_DEVICE_VM_DELETE:
      for (let i = 0; i < newState.length; i++) {
        if (newState[i].deviceId === action.id) {
          newState.splice(i, 1);
          break;
        }
      }
      return newState;
    case RECEIVE_DEVICE_SNAPSHOT_IMAGE:
      
      if (!action.payload.key) return state;
      deviceInfo = newState.find((x) => x.deviceId === action.payload.key);
      
      deviceInfo.SpanshotImageUrlObject = action.payload;
      return newState;
    default:
      return state;
  }
};

export const deviceLogReducer = (state = {pageCount:1,data:[]}, action) => {
  switch (action.type) {
    case RECEIVE_DEVICE_LOGS:
      return action.payload;
    default:
      return state;
  }
};
