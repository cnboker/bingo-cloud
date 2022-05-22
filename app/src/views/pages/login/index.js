import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useLocation, useHistory } from 'react-router-dom'
import Login from './components/Login'
import { login, errorReset } from '../../../accountAction'
import Logo from 'src/Logo'
export default () => {
  // grab what we need from props.  The handleSubmit from ReduxForm and the pieces
  // of state from the global state.
  const dispatch = useDispatch()
  const [error, setError] = useState('')
  const location = useLocation()
  const history = useHistory()
  const securityReducer = useSelector((state) => state.securityReducer)
  const submit = (values) => {
    const { userName, password } = values
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    const returnUrl = getReturnUrl()

    console.log('data,', values)
    //实现该调用，需要引用redux-thunk
    dispatch(login(userName, password, returnUrl))
  }

  const getReturnUrl = () => {
    console.log('location', location)

    if (!location) {
      return '/'
    }
    const search = location.search

    const params = new URLSearchParams(search)
    var url = params.get('returnUrl') || ''
    if (url) return url
    if (location.state) {
      return location.state.from.pathname
    }
    return '/'
  }
  useEffect(() => {
    dispatch(errorReset())
  }, [])
  useEffect(() => {
    if (!securityReducer.authenticated) {
      return
    }
    const url = getReturnUrl()
    if (url.indexOf('http:') !== -1) {
      window.location = url
    } else {
      if (url) {
        history.push(url)
      } else {
        history.push('/')
      }
    }
  }, [securityReducer.authenticated])

  useEffect(() => {
    setError(securityReducer.error)
  }, [securityReducer.error])
  return (
    <React.Fragment>
      <Logo />
      <Login submit={submit} error={error} />
    </React.Fragment>
  )
}
