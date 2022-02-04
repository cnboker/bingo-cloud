import { ORDERDETAIL_LIST_RESPONSE } from './contants'
import { post } from 'src/lib/api'

export const orderDetailListResponse = (payload) => {
  return { type: ORDERDETAIL_LIST_RESPONSE, payload }
}

const orderListUrl = `${process.env.REACT_APP_SERVICE_URL}/api/orderDetail/list`

//startDate, endDate, keyword, page = 0
export const orderDetailList = (q) => (dispatch) => {
  dispatch(
    post({
      url: `${orderListUrl}`,
      data: q,
      responseAction: orderDetailListResponse,
    }),
  )
}
