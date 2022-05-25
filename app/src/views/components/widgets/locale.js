import { langLoader } from '~/lib/localize'

const data = {
  en: {
    deviceQty: 'Device Quantity',
    deviceState: 'Device State',
    deviceLicense: 'Available License',
    diskStats: 'Disk Stats',
    available: 'Available',
  },
  zh: {
    deviceQty: '设备数量',
    deviceState: '设备状态',
    deviceLicense: '可利用许可',
    diskStats: '磁盘统计',
    available: '可用',
  },
}

export default langLoader(data)
