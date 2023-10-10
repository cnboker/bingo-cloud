import React, { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import Index from './index'
import { userDelete, userList, setAgent } from './actions'
import * as Dialog from '../../../components/dialog/Index'
export default () => {
  const [keyword, setKeyword] = useState('')
  const userReducer = useSelector((state) => state.userReducer)
  const dispatch = useDispatch()

  useEffect(() => {
    dispatch(userList(''))
  }, [])

  const onSearch = (keyword, page) => {
    setKeyword(keyword)
    dispatch(userList(keyword, page))
  }

  const onDelete = (id) => {
    Dialog.confirm('确定要此操作吗?', () => {
      dispatch(userDelete(id))
    })
  }
  const pagination = (target) => {
    onSearch(keyword, target.selected)
  }

  return (
    <>
      <Index onSearch={onSearch} dataset={userReducer} onDelete={onDelete} pagination={pagination} setAgent={(userName) => dispatch(setAgent(userName))} />
    </>
  )
}
