import { combineReducers } from 'redux'
import securityReducer from './accountReducer'
import { userReducer } from './views/pages/admin/users/reducer'
const appReducer = combineReducers({ securityReducer, userReducer })

const IndexReducer = (state, action) => {
  // if (action.type === 'CLIENT_UNSET') {
  //   const { routing } = state
  //   state = { routing }
  // }
  return appReducer(state, action)
}

export default IndexReducer
