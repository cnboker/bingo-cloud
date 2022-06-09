export const STATUS_BAR_UPDATE = 'STATUS_BAR_UPDATE'
export const statusBarUpdate = (payload) => ({
  type: STATUS_BAR_UPDATE,
  payload,
})

export const StatusBarType = {
  progressBar: 0,
  alert: 1,
  message: 2,
}

const initial = {
  visible: false,
  message: '',
  type: StatusBarType,
}
export const statusBarReducer = (state = initial, action) => {
  switch (action.type) {
    case STATUS_BAR_UPDATE:
      return {
        ...state,
        ...action.payload,
      }
    default:
      return state
  }
}
