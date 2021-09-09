import React, { useEffect } from 'react'
import { logout } from '../../accountAction'
import { useDispatch } from 'react-redux'
import { useHistory } from 'react-router'
export default () => {
  const dispatch = useDispatch()
  const history = useHistory()
  useEffect(() => {
    dispatch(logout())
    history.push('/login')
  }, [])

  return <div>logout...</div>
}
