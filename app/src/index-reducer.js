import { combineReducers } from 'redux'
import securityReducer from './accountReducer'
import { userReducer } from './views/pages/admin/users/reducer'
import { orderDetailReducer } from './views/pages/admin/orderDetails/reducer'
import { orderReducer } from './views/pages/admin/orders/reducer'
import { orderContextReducer } from './views/pages/orders/reducer'
import { deviceListReducer } from './views/pages/device/reducer'
import tagReducer from './views/pages/tags/reducer'

const appReducer = combineReducers({
  securityReducer,
  userReducer,
  orderDetailReducer,
  orderReducer,
  orderContextReducer,
  deviceListReducer,
  tagReducer,
})

const IndexReducer = (state, action) => {
  // if (action.type === 'CLIENT_UNSET') {
  //   const { routing } = state
  //   state = { routing }
  // }
  return appReducer(state, action)
}

export default IndexReducer
