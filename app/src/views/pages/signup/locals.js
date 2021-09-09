import LocalizedStrings from 'react-localization'
import Cookies from 'js-cookie'

const resources = new LocalizedStrings({
  en: {
    password_mismatch: 'Password do not match',
    register_failure: 'Register failure',
    create_account: 'Create Account',
    user_account: 'User Account',
    email: 'Email',
    password: 'Password',
    confirm_password: 'Confirm password',
    registered: 'Registerd?Click {0}',
    login: 'Login',
    create: 'Create',
  },
  zh: {
    password_mismatch: '密码不匹配',
    register_failure: '注册失败',
    create_account: '创建账号',
    user_account: '用户账号',
    email: '邮箱',
    password: '密码',
    confirm_password: '确认密码',
    registered: '已注册?点击{0}',
    login: '登录',
    create: '创建',
  },
})

var language = Cookies.get('language') || resources.getLanguage()
resources.setLanguage(language)
export default resources
