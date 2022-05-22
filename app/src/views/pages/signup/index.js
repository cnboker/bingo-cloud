// the actual container component itself and all of the react goodness
import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useHistory } from 'react-router-dom'
import Register from './components/Register'
import { signup, errorReset } from '../../../accountAction'
import R from './locale'
import Logo from 'src/Logo'
export default () => {
  const dispatch = useDispatch()
  const history = useHistory()
  const securityReducer = useSelector((state) => state.securityReducer)
  // grab what we need from props.  The handleSubmit from ReduxForm and the pieces
  // of state from the global state.
  const submit = (values) => {
    const { userName, password, email } = values
    dispatch(signup(userName, password, email))
  }
  useEffect(() => {
    dispatch(errorReset())
  }, [])
  useEffect(() => {
    if (securityReducer.signupSuccess) {
      history.push('/login')
    }
  }, [securityReducer])

  return (
    <>
      <Logo />
      <Register
        onsubmit={submit}
        error={
          securityReducer.error && securityReducer.error.split(',').map((x) => (R[x] ? R[x] : x))
        }
      />
    </>
  )
}
