import { useEffect } from 'react'
import { useHistory } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { getOrderSession } from './pages/orders/orderActions/actions'

export default () => {
  const history = useHistory()
  const dispatch = useDispatch()
  const context = useSelector((state) => state.orderContextReducer)

  useEffect(() => {
    dispatch(getOrderSession())
  }, [])

  useEffect(() => {
    //未下单或未试用，导航到quick start页面
    if (!context.orderSessionRequestSuccess) return
    console.log('context start...')
    if (context.isCreateTrial) {
      history.push('/quickStart')
    }
  }, [context.orderSessionRequestSuccess])
  return null
}
