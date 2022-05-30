import LocalizedStrings from 'react-localization'
import Cookies from 'js-cookie'

const resources = new LocalizedStrings({
  en: {
    userSetting: 'User Setting',
    resetPassword: 'Reset Password',
    smsSetting: 'SMS Notification Setting',
    inputEmail: 'Please input email for reset password',
    cmsMobile: 'CMS notification to receive mobile',
    emsMobile: 'EMS notification to receive mobile',
    day7Expired: '7 days expired notification',
    newPassword: 'New password',
    oldPassword: 'Old password',
    repeatPassword: 'Repeat password',
    passwordNotMatch: "Password don't match",
    email: 'Email',
  },
  zh: {
    communicationSettings: '通信设置',
    inputEmail: '请输入接收重置密码邮件邮箱',
    userSetting: '用户设置',
    resetPassword: '重置密码',
    smsSetting: '短信通设置',
    cmsMobile: '信发系统短信接收手机号',
    emsMobile: '环控系统短信接收手机号',
    day7Expired: '是否接收7天过期短信',
    newPassword: '新密码',
    oldPassword: '旧密码',
    repeatPassword: '确认密码',
    passwordNotMatch: '密码不匹配',
    email: '电子邮箱',
  },
})

var language = Cookies.get('language') || resources.getLanguage()
//console.log('language', language, Cookies.get('language'))
resources.setLanguage(language)

export default resources
