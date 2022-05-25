import React from 'react'
import { Route, Redirect } from 'react-router-dom'
import { updateToken } from '../accountAction'
import jwtDecode from 'jwt-decode'
export function authHeader() {
  return {
    Authorization: 'Bearer ' + localStorage.getItem('token'),
  }
}

var isAuth = undefined

export function checkAuthorization(dispatch) {
  if (isAuth !== undefined) return isAuth

  // attempt to grab the token from localstorage
  const access_token = localStorage.getItem('token')

  // if it exists
  if (access_token) {
    // parse it down into an object
    var { exp } = jwtDecode(access_token)
    var expDate = new Date(exp * 1000)
    //var jsTicks = new Date().getTime() * 10000 + 621355968000000000
    var now = new Date()
    // if the token has expired return false
    console.log('span time', expDate, now)
    if (expDate < now) {
      dispatch(updateToken())
      isAuth = false
      return false
    }

    dispatch(updateToken(access_token))
    isAuth = true
    return true
  }

  return false
}

export function PrivateRoute({ component: Component, dispatch, ...rest }) {
  const authed = checkAuthorization(dispatch)

  return (
    <Route
      {...rest}
      render={(props) =>
        authed === true ? (
          <Component {...rest} {...props} />
        ) : (
          <Redirect
            to={{
              pathname: '/login',
              state: {
                from: props.location,
              },
            }}
          />
        )
      }
    />
  )
}
