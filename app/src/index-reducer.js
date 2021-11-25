import { combineReducers } from 'redux'
import securityReducer from './accountReducer'
import { userReducer } from './views/pages/admin/users/reducer'
import { orderDetailReducer } from './views/pages/admin/orderDetails/reducer'
import { orderReducer } from './views/pages/orders/reducer'
import { orderContextReducer } from './views/pages/orderHandlers/reducer'
import { deviceListReducer } from './views/pages/device/reducer'
import tagReducer from './views/pages/tags/reducer'
import siderBarReducer from './store'
import { authorizeReducer } from './views/pages/authorize/reducer'
const appReducer = combineReducers({
  securityReducer,
  userReducer,
  orderDetailReducer,
  orderReducer,
  orderContextReducer,
  deviceListReducer,
  tagReducer,
  siderBarReducer,
  authorizeReducer,
})

const IndexReducer = (state, action) => {
  // if (action.type === 'CLIENT_UNSET') {
  //   const { routing } = state
  //   state = { routing }
  // }
  return appReducer(state, action)
}

export default IndexReducer
