import { USER_LIST_RESPONSE, USER_DELETE_RESPONSE, USER_UPDATE_RESPONSE } from './contants'
const initialState = {
  data: [],
  pageCount: 1,
  rowNums: 30,
}

export const userReducer = (state = initialState, action) => {
  var newState = { ...state }
  switch (action.type) {
    case USER_LIST_RESPONSE:
      return action.payload
    case USER_DELETE_RESPONSE:
      newState.data = newState.data.filter((x) => x.userName !== action.payload.userName)
      return newState
    case USER_UPDATE_RESPONSE:
      const { data } = newState
      var index = data.findIndex((x) => x.userName === action.payload.userName)
      data[index] = action.payload
      return newState
    default:
      return state
  }
}
