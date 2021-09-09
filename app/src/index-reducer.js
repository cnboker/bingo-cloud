import { combineReducers } from 'redux'
import securityReducer from './accountReducer'

const appReducer = combineReducers({ securityReducer })

const IndexReducer = (state, action) => {
  // if (action.type === 'CLIENT_UNSET') {
  //   const { routing } = state
  //   state = { routing }
  // }
  return appReducer(state, action)
}

export default IndexReducer
