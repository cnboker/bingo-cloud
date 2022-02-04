import React from 'react'
import { useSelector, useDispatch } from 'react-redux'
import Index from './index'
import { orderDetailList } from './actions'
export default () => {
  const orderDetailReducer = useSelector((state) => state.orderDetailReducer)
  const dispatch = useDispatch()

  const onSearch = (q) => {
    console.log('q', q)
    dispatch(orderDetailList(q))
  }

  return (
    <>
      <Index onSearch={onSearch} dataset={orderDetailReducer} />
    </>
  )
}
