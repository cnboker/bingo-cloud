import { langLoader } from '~/lib/localize'

const data = {
  en: {
    playStats: 'Play Stats',
    deviceLogs: 'Device Logs',
    logCount: 'Log Count',
    todayCount: 'Today Count',
    errorCount: 'Error Count',
    fixedCount: 'Fixed Count',
    deviceName: 'Device Name',
    logType: 'Log Type',
    detail: 'Detail',
    createDate: 'Create Date',
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
  },
}

export default langLoader(data)
