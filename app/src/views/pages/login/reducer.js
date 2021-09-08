import { LOGIN_REQUESTING, LOGIN_ERROR, LOGIN_SUCCESS, LOGIN_FINISH } from './constants'
import resources from './locals'
// where we'll manage the piece of state related to this container
const initialState = {
  requesting: false, //we've initated a request to signup
  successful: false, // the request has returned successfully
  messages: [], //an array of general messages to show the user
  errors: [], // an array of error messages to show the user
}

const loginReducer = (state = initialState, action) => {
  switch (action.type) {
    case LOGIN_REQUESTING:
      return {
        requesting: true,
        successful: false,
        messages: [{ body: `${resources.login}...`, time: new Date() }],
        errors: [],
      }
    case LOGIN_SUCCESS:
      return {
        errors: [],
        messages: [
          {
            body: `${resources.login_success}`,
            time: new Date(),
          },
        ],
        requesting: false,
        successful: true,
      }
    case LOGIN_ERROR:
      return {
        errors: state.errors.concat([
          {
            body: action.error.toString(),
            time: new Date(),
          },
        ]),
        messages: [],
        requesting: false,
        successful: false,
      }
    case LOGIN_FINISH:
      return {
        requesting: false,
        successful: false,
        messages: [{ body: `${resources.login_success}`, time: new Date() }],
        errors: [],
      }
    default:
      return state
  }
}

export default loginReducer
