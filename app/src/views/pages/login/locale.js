import { langLoader } from '~/lib/localize'

const data = {
  en: {
    login: 'Login',
    loginTitle: 'Sign in to your account',
    forgetPassword: 'Forget password',
    signup: 'Signup',
    signupDesc: 'Technology make the thing simple!',
    Invalid_username_or_password: 'Invalid Username or Password',
  },
  zh: {
    login: '登录',
    loginTitle: '账号登录',
    forgetPassword: '忘记密码',
    signup: '注册',
    signupDesc: '用科技让事情变得简单',
    Invalid_username_or_password: '无效的用户或密码',
  },
}

export default langLoader(data)
