import { langLoader } from '~/lib/localize'

const data = {
  en: {
    playStats: 'Play Stats',
    deviceLogs: 'Device Logs',
    logCount: 'Log Total',
    todayCount: 'Today Infos',
    errorCount: 'Errors',
    todayErrorTotal: 'Today Errors',
    deviceName: 'Device Name',
    logType: 'Log Type',
    detail: 'Detail',
    createDate: 'Create Date',
    information: 'Information',
    warning: 'Warning',
    error: 'Error',
    deviceType: 'Device Type',
    playLabel: 'Duration(Hours)',
    qty: 'QTY',
  },
  zh: {
    playStats: '播放统计',
    deviceLogs: '设备日志',
    logCount: '日志总数',
    todayCount: '今日总数',
    errorCount: '错误数量',
    fixedCount: '修复数量',
    deviceName: '设备名称',
    logType: '日志类型',
    detail: '详情',
    createDate: '创建日期',
    information: '消息',
    warning: '警告',
    error: '错误',
    deviceType: '设备类型',
    todayErrorTotal: '今日错误数量',
    playLabel: '播放时长(小时)',
    qty: '数量',
  },
}

export default langLoader(data)
