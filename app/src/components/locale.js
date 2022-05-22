import { langLoader } from '~/lib/localize'

const data = {
  en: {
    quickStart: 'Quick start',
    dashboard: 'Dashboard',
    fileManage: 'File Manage',
    deviceMange: 'Device Manage',
  },
  zh: {
    quickStart: '快速入门',
    dashboard: '仪表盘',
    fileManage: '素材管理',
    deviceMange: '设备管理',
  },
}

export default langLoader(data)
