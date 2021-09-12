import React, { useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import Index from './index'
import { free, orderList } from './actions'
import * as Dialog from '../../../components/dialog/Index'
export default () => {
  const userReducer = useSelector((state) => state.userReducer)
  const dispatch = useDispatch()

  const onSearch = (q) => {
    console.log('q', q)
    dispatch(orderList(q))
  }

  const onFreeOrder = (id) => {
    Dialog.confirm('确定要此操作吗?', () => {
      dispatch(free(id))
    })
  }

  return (
    <>
      <Index onSearch={onSearch} dataset={userReducer} onFreeOrder={onFreeOrder} />
    </>
  )
}
