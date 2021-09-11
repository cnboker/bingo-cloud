import { API_RESPONSE_ERROR } from './constants'
export const apiResponseError = (payload) => {
  return { type: API_RESPONSE_ERROR, payload }
}
