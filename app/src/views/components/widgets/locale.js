import { langLoader } from '~/lib/localize'

const data = {
  en: {
    deviceQty: 'Device Quantity',
    deviceState: 'Device State',
    deviceLicense: 'Availiable License',
    diskStats: 'Disk Stats',
    availiable: 'Availiable',
  },
  zh: {
    deviceQty: '设备数量',
    deviceState: '设备状态',
    deviceLicense: '可利用许可',
    diskStats: '磁盘统计',
    availiable: '可用',
  },
}

export default langLoader(data)
