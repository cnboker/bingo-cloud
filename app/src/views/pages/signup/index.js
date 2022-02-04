// the actual container component itself and all of the react goodness
import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useHistory } from 'react-router-dom'
import Register from './components/Register'
import { signup } from '../../../accountAction'
export default () => {
  const dispatch = useDispatch()
  const [error, setError] = useState('')
  const history = useHistory()
  const securityReducer = useSelector((state) => state.securityReducer)
  // grab what we need from props.  The handleSubmit from ReduxForm and the pieces
  // of state from the global state.
  const submit = (values) => {
    const { userName, password, email } = values
    dispatch(signup(userName, password, email))
  }

  useEffect(() => {
    if (securityReducer.signupSuccess) {
      history.push('/login')
    }
    if (securityReducer.error) {
      setError(securityReducer.error)
    }
  }, [securityReducer])

  return <Register onsubmit={submit} error={error} />
}
