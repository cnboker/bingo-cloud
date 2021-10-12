import {CLIENT_SET, CLIENT_UNSET} from "./constants"

const initialState = {
}

const reducer = (state = initialState, action) => {
  switch (action.type) {
    case CLIENT_SET:
      if (state.access_token === action.token.access_token) {
        return state
      }
      return {
        ...state,
        ...action.token
      }

    case CLIENT_UNSET:
      return {}
    
    default:
      return state
  }
}

export default reducer
