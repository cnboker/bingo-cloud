import { take, fork, cancel, call, put, cancelled } from 'redux-saga/effects'
import { LOGIN_REQUESTING, LOGIN_SUCCESS, LOGIN_ERROR } from './constants'
import { ResponseHandle } from '../../utils/ResponseHandle'
import { CLIENT_UNSET } from '../Client/constants'
import { setClient, unsetClient } from '../Client/action'
import Cookies from 'js-cookie'

const url = `${process.env.REACT_APP_AUTH_URL}/api/token`
const cookieDomain = `${process.env.REACT_APP_COOKIE_DOMAIN}`
function callApi(action) {
  const { userName, password, returnUrl } = action
  console.log(`userName:${userName},password:${password},returnUrl:${returnUrl}`)

  const formData = Object.keys(action)
    .map((key) => {
      return encodeURIComponent(key) + '=' + encodeURIComponent(action[key])
    })
    .join('&')
  console.log('formdata,', formData)
  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData,
  })
    .then(ResponseHandle)
    .catch((error) => {
      throw error
    })
}

function* loginFlow(action) {
  let token
  try {
    const { userName } = action
    // pulls 'calls' to our signupApi with our email and password
    // from our dispatched signup action, and will PAUSE
    // here until the API async function, is complete!
    token = yield call(callApi, action)
    //inform Redux to set out client token, this is non blocking
    console.log('token,', token)
    var jwtDecode = require('jwt-decode')
    var { email, userSetting, isAgent, agentUser } = jwtDecode(token.access_token)
    console.log('userSetting', userSetting)
    userSetting = userSetting ? JSON.parse(userSetting) : {}
    token = {
      ...token,
      email,
      userSetting,
      isAgent: isAgent === 'true',
      agentUser,
      userName,
      CMSUSer: false,
    }
    //工厂账户处理
    if (token.isAgent) {
      //yield put(pesistFactoryToken(token.access_token))
      token.factoryToken = token.access_token
    }
    console.log('token,', token)
    yield put(setClient(token))

    var tokenString = JSON.stringify(token)
    localStorage.setItem('token', tokenString)

    Cookies.set('token', tokenString, { expires: 7, path: '', domain: cookieDomain })
    yield put({ type: LOGIN_SUCCESS })
  } catch (error) {
    yield put({ type: LOGIN_ERROR, error })
  } finally {
    if (yield cancelled()) {
      //redirect login
      //history.push('/login')
    }
  }
  return token
}

function* logout() {
  var mqttConnector = require('~/views/dms2/api/mqtt_api')
  mqttConnector.unSubscrible()
  yield put(unsetClient())
  //remove our token
  localStorage.removeItem('token')
  console.log('remove token')
  Cookies.remove('token', { path: '', domain: cookieDomain })
  //rediect login

  //BrowserRouter.push('/login')

  //history.push('/login')
}
// call(阻塞effect,即generator在调用结束之前不能只想任何其他事情)
// fork(非阻塞effect)
// take(监听action）, put（发起action)
function* loginWather() {
  //reference http://leonshi.com/redux-saga-in-chinese/docs/advanced/NonBlockingCalls.html
  while (true) {
    //阻塞等待LOGIN_REQUESTING ACTION
    const requestAction = yield take([CLIENT_UNSET, LOGIN_REQUESTING])
    if (requestAction.type === CLIENT_UNSET) {
      yield call(logout)
      continue
    }
    //非阻塞执行loginFlow逻辑
    const task = yield fork(loginFlow, requestAction)
    //阻塞等待CLIENT_UNSET,LOGIN_ERROR
    const action = yield take([CLIENT_UNSET, LOGIN_ERROR])
    console.log('loginWatcher client_unset,login_error action', action)
    //如果当前action是client_unset则取消登录流
    if (action.type === CLIENT_UNSET) yield cancel(task)
    //登出
    yield call(logout)
  }
}

export default loginWather
