import React, { useEffect, useState } from 'react'
import Select from 'react-select'
import { useSelector, useDispatch } from 'react-redux'
import { userList } from '~/views/pages/admin/users/actions'
import { requestToken, updateToken } from '~/accountAction'

export default () => {
  const dispatch = useDispatch()
  const { data: userDataList } = useSelector((state) => state.userReducer)
  const client = useSelector((state) => state.securityReducer)
  const [, updateState] = React.useState()
  const forceUpdate = React.useCallback(() => updateState({}), [])

  useEffect(() => {
    dispatch(userList(''))
  }, [])

  useEffect(() => {
    forceUpdate()
  }, [client.userName])

  const switchToParent = () => {
    dispatch(updateToken(client.agentToken))
  }
  //
  const switchToChildAccount = (userName) => {
    const { agentToken } = client
    dispatch(requestToken(userName, agentToken))
  }

  if (client.isAgent || client.isAdmin) {
    return (
      <Select
        placeholder={'switch account'}
        onChange={({ value }) => switchToChildAccount(value)}
        options={userDataList.map((x) => {
          return { label: x.userName, value: x.userName }
        })}
      />
    )
  } else {
    return (
      <button className="btn btn-link" onClick={() => switchToParent()}>
        swtich to parent
      </button>
    )
  }
}
