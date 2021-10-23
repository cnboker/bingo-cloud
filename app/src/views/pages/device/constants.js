import R from './locale'
export const RECEIVE_DEVICE_LIST = 'RECEIVE_DEVICE_LIST'
export const RECEIVE_DEVICE_STATUS_LIST = 'RECEIVE_DEVICE_STATUS_LIST'
export const RECEIVE_DOWNLOAD_PROGRESS_UPDATE = 'RECEIVE_DOWNLOAD_PROGRESS_UPDATE'
export const RECEIVE_DEVICE_UPDATE_NAME = 'RECEIVE_DEVICE_UPDATE_NAME'
export const RECEIVE_DEVICE_UPDATE_SENSOR = 'RECEIVE_DEVICE_UPDATE_SENSOR'
export const RECEIVE_UPDATE_LICENSE = 'RECEIVE_UPDATE_LICENSE'
export const RECEIVE_UPDATE_GROUP = 'RECEIVE_UPDATE_GROUP'
export const RECEIVE_DEVICE_SELECT = 'RECEIVE_DEVICE_SELECT'
export const RECEIVE_DEVICE_VM_DELETE = 'RECEIVE_DEVICE_VM_DELETE'
export const RECEIVE_DEVICE_SNAPSHOT_IMAGE = 'RECEIVE_DEVICE_SNAPSHOT_IMAGE'
export const RECEIVE_DEVICE_LOGS = 'RECEIVE_DEVICE_LOGS'
//this branch
export const DeviceStatusList = [
  {
    key: R.all,
    value: 0,
  },
  {
    key: R.online,
    value: 1,
  },
  {
    key: R.offline,
    value: 2,
  },
]
