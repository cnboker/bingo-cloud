import { RECEIVE_TAGS } from './actions'
import merge from 'lodash/merge'

const tagReducer = (
  state = {
    DeviceGroup: [],
  },
  action,
) => {
  Object.freeze(state)
  let newState = merge({}, state)
  switch (action.type) {
    case RECEIVE_TAGS:
      var tags = action.payload.tags
      newState[action.payload.catelog] = tags
      return newState
    default:
      return state
  }
}

export default tagReducer
