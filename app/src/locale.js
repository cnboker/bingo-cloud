import LocalizedStrings from 'react-localization'
import Cookies from 'js-cookie'

const GR = new LocalizedStrings({
  en: {
    orderNo: 'Order No',
    tenant: 'Tenant',
    price: 'Price',
    promotion_code: 'Promotion Code',
    subtotal: 'Subtotal',
    amount: 'Amount',
    device_count: 'Device Count',
    deviceName: 'Device Name',
    pay: 'Payment',
    search: 'Search',
    tip: 'Tip',
    info: 'Infomation',
    confirmInfo: 'Are you sure this operation?',
    none: 'None',
    checkout: 'Checkout',
    cancelOrder: 'Cancel Order',
    paid: 'Paid',
    free: 'Free',
    remark: 'Remark',
    status: 'Status',
    nextpage: 'Next Page',
    lastpage: 'Last Page',
    email: 'Email',
    account: 'Account',
    operation: 'Operation',
    create: 'Create',
    return: 'Return',
    update: 'Update',
    selectServer: 'Select Server',
    create_instance: 'Create Instance',
    initialize_instance: 'Initialize Instance',
    trial: 'Trial',
    create_date: 'Create Date',
    formal: 'Formal',
    license: 'License',
    EnvironmentalControl: 'EMS',
    submit: 'Submit',
    name: 'Name',
    normal: 'Normal',
    online: 'Online',
    warn: 'Warn',
    error: 'Error',
    offline: 'Offline',
    save: 'Save',
    send: 'Send',
    delete: 'Delete',
    edit: 'Edit',
    desc: 'Description',
    data: 'Data',
    valid: 'Valid',
    invalid: 'Invalid',
    number: 'Number',
    restore: 'Restore',
    assigned: 'Assigend',
    unAssigned: 'UnAssigned',
    lastUpdateTime: 'LastUpdateTime',
    OS: 'OS',
    resolution: 'Resolution',
    ip: 'IP',
    sensorManifest: 'Sensor Manifest',
    messageType: 'Message Type',
    startDate: 'Start Date',
    endDate: 'End Date',
    message: 'Message',
    warning: 'Warning',
    fatal: 'Fatal',
    dataNotAvailiable: 'Device offline or data are not available',
    waitLoading: 'Data Loading...',
    duration: 'Duration',
    second: 'Second',
    quantity: 'Quantity',
    sensor: 'Sensor',
    value: 'Value',
    createDate: 'CreateDate',
    connection: 'Connection',
  },
  zh: {
    orderNo: '订单编号',
    tenant: '租户',
    price: '单价(每天)',
    promotion_code: '优惠券',
    subtotal: '小计',
    amount: '实际付款金额',
    deviceName: '设备名称',
    device_count: '设备数量',
    pay: '付款',
    search: '查询',
    tip: '提示',
    info: '确认信息',
    confirmInfo: '确定此操作吗?',
    none: '无',
    checkout: '去付款',
    cancelOrder: '取消订单',
    paid: '已付款',
    free: '免单',
    remark: '备注',
    status: '状态',
    nextpage: '下一页',
    lastpage: '上一页',
    email: '邮箱',
    account: '用户账户',
    operation: '操作',
    create: '创建',
    return: '返回',
    update: '更新',
    selectServer: '选择服务器',
    create_instance: '创建实例',
    initialize_instance: '初始化实例',
    trial: '试用',
    create_date: '创建日期',
    formal: '正式',
    license: '许可',
    EnvironmentalControl: '环控',
    submit: '提交',
    name: '名称',
    normal: '正常',
    online: '在线',
    warn: '警告',
    error: '错误',
    offline: '离线',
    save: '保存',
    send: '发送',
    delete: '删除',
    edit: '编辑',
    desc: '描述',
    data: '数据',
    valid: '有效',
    invalid: '无效',
    number: '序号',
    restore: '恢复',
    assigned: '已分配',
    unAssigned: '未分配',
    lastUpdateTime: '更新时间',
    OS: '操作系统',
    resolution: '分辨率',
    ip: 'IP',
    sensorManifest: '传感器清单',
    messageType: '消息类型',
    startDate: '起始日期',
    endDate: '结束日期',
    message: '消息',
    warning: '警告',
    fatal: '异常',
    dataNotAvailiable: '设备离线或数据不可用',
    waitLoading: '等待加载数据',
    duration: '时长',
    second: '秒',
    quantity: '数量',
    sensor: '传感器',
    value: '值',
    createDate: '创建时间',
    connection: '连接',
  },
})

var language = Cookies.get('language') || GR.getLanguage()
GR.setLanguage(language)

export default GR
