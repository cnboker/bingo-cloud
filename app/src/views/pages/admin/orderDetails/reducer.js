import { ORDERDETAIL_LIST_RESPONSE } from './contants'
const initialState = {
  data: [],
  pageCount: 1,
  rowNums: 30,
}

export const orderDetailReducer = (state = initialState, action) => {
  switch (action.type) {
    case ORDERDETAIL_LIST_RESPONSE:
      return action.payload
    default:
      return state
  }
}
