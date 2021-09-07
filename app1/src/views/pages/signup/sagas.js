import {call, put, takeLatest} from 'redux-saga/effects'
import {SIGNUP_REQUESTING, SIGNUP_SUCCESS, SIGNUP_ERROR, SIGNUP_RESET} from './constants'
import {ResponseHandle} from "../../utils/ResponseHandle"
import { delay } from 'redux-saga'

const signupUrl = `${process.env.REACT_APP_AUTH_URL}/api/signup`

//json exception handle
function signupApi(userName, email, password,client) {
  console.log('signupApi', `userName:${userName},email:${email},password:${password}`,client)
  var headers = {
    'Content-Type': 'application/json'
  };
  if(client){
    headers.Authorization= `bearer ${client.access_token}`
  }
  return fetch(signupUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({userName, email, password})
  })
  // .then(response => {   return response.json().then(json => {     return
  // response.ok ? json :     Promise.reject(json).then(e){       throw
  // error(e.map(function(item)=>item.description).join(','))     }   }) })
    .then(ResponseHandle)
  //.then(response => response.json()) .then(json => json)
    .catch((error) => {
    throw error
  })
}

function * signupFlow(action) {
  try {
    const {userName, email, password,client} = action
    // pulls "calls" to our signupApi with our email and password from our
    // dispatched signup action, and will PAUSE here until the API async function,
    // is complete!
    const response = yield call(signupApi, userName, email, password,client)
    // when the above api call has completed it will "put", or dispatch, an action
    // of type SIGNUP_SUCCESS with the successful response.
    yield put({type: SIGNUP_SUCCESS, response})
    yield delay(500)
    console.log('SIGNUP_RESET')
    yield put({type: SIGNUP_RESET})

  } catch (error) {
    yield put({type: SIGNUP_ERROR, error})
  }

}

function * signupWather() {
  yield takeLatest(SIGNUP_REQUESTING, signupFlow)
}

export default signupWather