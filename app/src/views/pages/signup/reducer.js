import { SIGNUP_REQUESTING, SIGNUP_ERROR, SIGNUP_SUCCESS,SIGNUP_RESET } from './constants'
// where we'll manage the piece of state related to this container
const initialState = {
  requesting: false, //we've initated a request to signup
  successful: false, // the request has returned successfully
  messages: [], //an array of general messages to show the user
  errors: [] // an array of error messages to show the user
}

const signupReducer = (state = initialState, action) => {
  switch (action.type) {
    case SIGNUP_RESET:
      console.log('SIGNUP_RESET',state)
      return {
        requesting: false, //we've initated a request to signup
        successful: false, // the request has returned successfully
        messages: [], //an array of general messages to show the user
        errors: [] // an array of error messages to show the user
      };
    case SIGNUP_REQUESTING:
      return {
        requesting: true,
        successful: false,
        errors:[],
        messages: [{ body: 'waiting...', time: new Date() }]
      }
    case SIGNUP_SUCCESS:
      return {
        errors: [],
        messages: [{
          body: `success`,
          time: new Date()
        }],
        requesting: false,
        successful: true
      }
      
      
    case SIGNUP_ERROR:
    
      return {
        errors: state.errors.concat([{
          body: action.error.toString(),
          time: new Date()
        }]),
        messages: [],
        requesting: false,
        successful: false
      }
    default:
      return state
  }
}

export default signupReducer