import { langLoader } from '~/lib/localize'

const data = {
  en: {
    authorizeRequest: 'Requesting authentication...',
    authenticationSuccessMessage: 'Authentication success, open PC to view device management',
    deviceAuthentication: 'Device authentication',
    nodevice: 'No availiable devices',
  },
  zh: {
    authorizeRequest: '正在请求认证信息...',
    authenticationSuccessMessage: '认证成功,请打开桌面程序做其他操作.',
    deviceAuthentication: '设备授权',
    nodevice: '无可用设备',
  },
}
export default langLoader(data)
