import { combineReducers } from 'redux'
import securityReducer from './accountReducer'
import { userReducer } from './views/pages/admin/users/reducer'
import { orderDetailReducer } from './views/pages/admin/orderDetails/reducer'
import { orderReducer } from './views/pages/orders/reducer'
import { orderContextReducer } from './views/pages/orders/orderActions/reducer'
import { deviceListReducer, deviceLogReducer } from './views/pages/device/reducer'
import tagReducer from './views/pages/tags/reducer'
import siderBarReducer from './store'
import { authorizeReducer } from './views/pages/authorize/reducer'
import homeReducer from './views/dashboard/reducer'
import { mqttDownloadProgressReducer } from './views/pages/mqtt/reducer'
import { statusBarReducer } from './statusBarReducer'
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
  homeReducer,
  deviceLogReducer,
  mqttDownloadProgressReducer,
  statusBarReducer,
})

const IndexReducer = (state, action) => {
  // if (action.type === 'CLIENT_UNSET') {
  //   const { routing } = state
  //   state = { routing }
  // }
  return appReducer(state, action)
}

export default IndexReducer
