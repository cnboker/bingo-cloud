import LocalizedStrings from 'react-localization'
import Cookies from "js-cookie"

const resources = new LocalizedStrings({
  en: {
    device_mgt:'Device Management',
    device_status: 'Status',
    tenant: 'Tenant',
    user: 'User',
    device_name: 'Name',
    license_info: 'License',
    operation: 'Operation',
    authorize: 'Authorize',
    search: 'Search',
    tip: 'Tip',
    info: 'Infomation',
    confirmInfo: 'Are you sure this operation?',
    none: 'None',
    checkout: 'Checkout',
    cancelOrder: 'Cancel Order',
    invalid: 'Invalid',
    valid: 'Valid',
    remark: 'Remark',
    status: 'Status',
    update_device_name:'Update Name',
    set_sensor:'Set Sensor',
    sensorId:'Sensor ID',
    sensorName:'Name',
    setSensor:'Config Sensor',
    sensorModel:'Model',
    online:'Online',
    all:'All',
    offline:'Offline',
    downloadProgress:'Download Progress',
    more:'More',
    noData:'No Data',
    progress:'Progress',
    downloaded:'Downloaded',
    downloadSpeed:'Download Speed',
    remainingTime:'Remaining Time',
    groupSetting:'Group Setting',
    group:'Group',
    notset:'Not Set',
    groupFilter:'Group Filter',
    selectedDevices:'Selected Device',
    createVMDevice:'Create VM Device',
    quantity:'Quantity',
    inputDeviceQuantity:'Please input device quantity.',
    deviceDetail:'Device Details',
    deviceMonitor:'Device Monitor',
    deviceScreenCap:'Screen Cap',
    deviceLogs:'Device Logs',
    downlaodProgress:'File Download Progress',
    connectionStatus:'Connection Status',
    boardStatus:'Board Status',
    setMap:'Map Locate',
    ecWorktime:'EC Worktime',
    screenWorktime:'Screen Worktime',
    playerWorktime:'Player Worktime',
    day7StateStatistics:'7-days state statistics',
    days7WarningStatistics:'7-days warning statistics',
    days7WarningMessage:'7-days warning message',
    recoveryTime:'Recovery Time'
  },
  zh: {
    device_mgt:'设备管理',
    device_status: '状态',
    tenant: '租户',
    user: '用户',
    device_name: '设备名称',
    license_info: '许可',
    operation: '操作',
    authorize: '授权',
    search: "查询",
    tip: '提示',
    info: '确认信息',
    confirmInfo: '确定此操作吗?',
    none: '无',
    checkout: '去付款',
    cancelOrder: '取消订单',
    invalid: '无效',
    valid: '有效',
    remark: '备注',
    status: '状态',
    update_device_name:'更新名称',
    set_sensor:'设置传感器',
    sensorId:'设备ID',
    sensorName:'名称',
    sensorModel:'型号',
    online:'在线',
    all:'全部',
    offline:'离线',
    downloadProgress:'下载进度',
    more:'更多',
    noData:'无数据',
    progress:'进度',
    downloaded:'已下载',
    downloadSpeed:'下载速度',
    remainingTime:'剩余时间',
    groupSetting:'分组',
    group:'设备分组',
    notset:'未分配',
    groupFilter:'组过滤',
    selectedDevices:'关联设备',
    setSensor:'环控设备关联',
    createVMDevice:'创建虚拟设备',
    quantity:'数量',
    inputDeviceQuantity:'请输入设备数量',
    deviceDetail:'设备详情',
    deviceMonitor:'设备监控',
    deviceScreenCap:'屏幕截屏',
    deviceLogs:'设备日志',
    downlaodProgress:'设备文件下载进度',
    connectionStatus:'连接状态',
    boardStatus:'环控板连接状态',
    setMap:'地理位置设置',
    ecWorktime:'环控设备工作时长',
    screenWorktime:'屏幕工作时长',
    playerWorktime:'节目播放时长',
    day7StateStatistics:'7天工作状态统计',
    days7WarningStatistics:'7天警告统计',
    days7WarningMessage:'7天警告消息',
    recoveryTime:'恢复时间'
  }
})

var language = Cookies.get('language') || resources.getLanguage()
resources.setLanguage(language)
export default resources