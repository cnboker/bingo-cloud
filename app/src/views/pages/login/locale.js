import { langLoader } from '~/lib/localize'

const data = {
  en: {
    login: 'Login',
    loginTitle: 'Sign in to your account',
    forgetPassword: 'Forget password',
    signup: 'Signup',
    signupDesc: 'Technology make the thing simple!',
  },
  zh: {
    login: '登录',
    loginTitle: '账号登录',
    forgetPassword: '忘记密码',
    signup: '注册',
    signupDesc: '用科技让事情变得简单',
  },
}

export default langLoader(data)
