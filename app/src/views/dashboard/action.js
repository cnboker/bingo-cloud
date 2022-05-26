import { HOME_DATA_REQUEST } from './constants'
import { asyncGet } from '~/lib/api'
export function homeReceive(payload) {
  return {
    type: HOME_DATA_REQUEST,
    payload,
  }
}
export const homeRequest = () => (dispatch) => {
  const homeUrl = `${process.env.REACT_APP_SERVICE_URL}/api/home/index`

  asyncGet({
    url: homeUrl,
  }).then((res) => {
    dispatch(homeReceive(res.data))
  })
}
