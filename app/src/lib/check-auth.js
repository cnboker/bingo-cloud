import React from 'react'
import { Route, Redirect } from 'react-router-dom'
import { updateToken } from '../accountAction'

export function authHeader() {
  // return authorization header with jwt token
  let user = JSON.parse(localStorage.getItem('token'))

  if (user && user) {
    return {
      Authorization: 'Bearer ' + user.access_token,
    }
  } else {
    return {}
  }
}

var isAuth = undefined

export function checkAuthorization(dispatch) {
  if (isAuth !== undefined) return isAuth

  // attempt to grab the token from localstorage
  const storedToken = localStorage.getItem('token')

  // if it exists
  if (storedToken) {
    // parse it down into an object
    const token = JSON.parse(storedToken)
    var jsTicks = new Date().getTime() * 10000 + 621355968000000000
    // if the token has expired return false
    console.log('span time', (token.expired - jsTicks) / 10000)
    if (token.expired < jsTicks) {
      dispatch(updateToken({}))
      isAuth = false
      return false
    }

    dispatch(updateToken(token))
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
