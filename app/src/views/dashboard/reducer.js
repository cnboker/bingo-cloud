import { HOME_DATA_REQUEST } from './constants'
const initialState = {
  basicInfo: {
    offlineCount: 1,
    onlineCount: 99,
    licenseCount: 100,
    availiableLicenceCount: 0,
    deviceDataByM: [
      { key: '1', value: 2 },
      { key: '2', value: 3 },
      { key: '3', value: 4 },
      { key: '4', value: 5 },
      { key: '5', value: 3 },
    ],
    licenseDataByM: [
      { key: '1', value: 2 },
      { key: '2', value: 3 },
      { key: '3', value: 4 },
      { key: '4', value: 5 },
      { key: '5', value: 3 },
    ],
  },
  playStats: {
    monthData: [
      { key: '1', value: 100 },
      { key: '2', value: 200 },
      { key: '3', value: 300 },
      { key: '4', value: 150 },
      { key: '5', value: 130 },
    ],
    yearData: [
      { key: '1', value: 1000 },
      { key: '2', value: 2000 },
      { key: '3', value: 3000 },
      { key: '4', value: 1500 },
      { key: '5', value: 1300 },
    ],
  },
  deviceLogsStats: {
    errorTotal: 5,
    todayErrorTotal: 0,
    todayTotal: 10,
    total: 100,
    deviceLogs: [
      {
        deviceName: 'raspberry',
        deviceId: '01:3f:2d:12:22',
        logType: 0,
        remark: 'file ad.mpeg file download finished',
      },
      {
        deviceName: 'raspberry',
        deviceId: '01:3f:2d:12:22',
        logType: 1,
        remark: 'device restart',
      },
      {
        deviceName: 'raspberry',
        deviceId: '01:3f:2d:12:22',
        logType: 2,
        remark: 'player crash!',
      },
    ],
  },
}

export default (state = initialState, action) => {
  switch (action.type) {
    case HOME_DATA_REQUEST:
      return action.payload
    default:
      return state
  }
}
