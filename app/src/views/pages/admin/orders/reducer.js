import { ORDER_LIST_RESPONSE, ORDER_DELETE_RESPONSE, ORDER_UPDATE_RESPONSE } from './contants'
const initialState = {
  data: [],
  pageCount: 1,
  rowNums: 30,
}

export const orderReducer = (state = initialState, action) => {
  var newState = { ...state }
  switch (action.type) {
    case ORDER_LIST_RESPONSE:
      return action.payload
    case ORDER_DELETE_RESPONSE:
      newState.data = newState.data.filter((x) => x.userName !== action.payload.userName)
      return newState
    case ORDER_UPDATE_RESPONSE:
      const { data } = newState
      var index = data.findIndex((x) => x.userName === action.payload.userName)
      data[index] = action.payload
      return newState
    default:
      return state
  }
}
