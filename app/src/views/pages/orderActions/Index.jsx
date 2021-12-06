import React, { useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { getOrderSession } from './actions'
import { Link } from 'react-router-dom'

//create order
export default () => {
  const dispatch = useDispatch()
  const orderContextReducer = useSelector((state) => state.orderContextReducer)
  const { isTrail } = orderContextReducer

  useEffect(() => {
    dispatch(getOrderSession())
  }, [])

  return (
    <>
      {isTrail && (
        <Link color="primary" to="/trial">
          试用
        </Link>
      )}
      <Link color="info" to="/orderActions/create">
        购买许可
      </Link>
    </>
  )
}
