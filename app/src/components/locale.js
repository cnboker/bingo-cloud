import { langLoader } from '~/lib/localize'

const data = {
  en: {
    quickStart: 'Quick start',
    dashboard: 'Dashboard',
    fileManage: 'File Manage',
    deviceManage: 'Device Manage',
    cart: 'Cart',
  },
  zh: {
    quickStart: '快速入门',
    dashboard: '仪表盘',
    fileManage: '素材管理',
    deviceManage: '设备管理',
    cart: '购物车',
  },
}

export default langLoader(data)
