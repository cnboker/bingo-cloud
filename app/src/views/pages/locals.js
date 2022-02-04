import { langLoader } from '~/lib/localize'

const data = {
  en: {
    login: 'Login',
    userName: 'User Name',
    password: 'Password',
    not_register: 'Have not yet registed? Click {0}',
    forget_password: 'Forget your password? Click {0}',
    reset_password: 'Reset password',
    register: 'Register',
    login_success: 'Login Success',
  },
  zh: {
    login: '登录',
    userName: '用户账号',
    password: '密码',
    not_register: '还未注册?点击 {0}',
    forget_password: '忘记密码?点击 {0}',
    reset_password: '重置密码',
    register: '注册',
    login_success: '登录成功',
  },
}
export default langLoader(data)
