import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { reduxForm, Field } from 'redux-form'
import { connect } from 'react-redux'
import { Link } from 'react-router-dom'
import { loginRequest, loginFinish } from './actions'
import { required, renderField } from '../../utils/fieldLevelValidation'
// Import the helpers.. that we'll make here in the next step
import FetchMessage from '../../notifications/fetchMessage'
import resources from './locals'
import LanguageSwitch from '../../components/Header/LanguageSwitch'
import Page from '~/views/Components/Pages/Page'
import TitleBox from '~/views/Components/Pages/TitleBox'
import { currentUserRole } from '~/lib/check-auth'
import { unsetClient } from '~/views/pages/client/action'

class Login extends Component {
  componentDidMount() {
    // console.log('getInterfaceLanguage()', resources.getInterfaceLanguage())
    // console.log('getLanguage()', resources.getLanguage())
  }
  // grab what we need from props.  The handleSubmit from ReduxForm and the pieces
  // of state from the global state.
  submit = (values) => {
    this.props.dispatch(unsetClient())
    var action = Object.assign({}, values, {
      returnUrl: this.getReturnUrl(),
    })
    console.log('action,', action)
    this.props.loginRequest(action)
  }

  getReturnUrl() {
    if (!this.props.location) {
      return '/'
    }
    const search = this.props.location.search

    const params = new URLSearchParams(search)
    var url = params.get('returnUrl') || ''
    if (url) return url
    if (this.props.location.state){
      return this.props.location.state.from.pathname
    }
    return '/'
  }

  componentDidUpdate(preProps) {
    const { history } = this.props
    if (this.props.login.successful) {
      this.props.loginFinish()
      var url = this.getReturnUrl()
      if (url.indexOf('http:') !== -1) {
        window.location = url
      } else {
        var role = currentUserRole()
        console.log('login role', role)
        if (role === 'user') {
          url = '/v2'
        }
        if (url) {
          history.push(url)
        } else {
          history.push('/')
        }
      }
    }
  }

  render() {
    const { handleSubmit } = this.props
    return (
      <React.Fragment>
        <Page pageHeight={400}>
          <div className='form'>
            <TitleBox>
              <LanguageSwitch {...this.props} />
            </TitleBox>
            <form onSubmit={handleSubmit(this.submit)} className='layui-form'>
              <Field
                name='userName'
                type='text'
                className='layui-input'
                labelIcon='layui-icon-username'
                component={renderField}
                placeholder={resources.userName}
                validate={required}
              />
              <Field
                name='password'
                type='password'
                labelIcon='layui-icon-password'
                className='layui-input'
                component={renderField}
                placeholder={resources.password}
                validate={required}
              />

              <div className='layui-form-item'>
                <div className='layui-input-block'>
                  <button action='submit' className='layui-btn'>
                    {resources.login}
                  </button>
                </div>
              </div>
            </form>
          </div>

          <FetchMessage requestState={this.props.login} />

          <div className='hrefs spaceBetween'>
            <Link to='/signup'>{resources.register}</Link>
            <a href='/client/forgotPassword'>{resources.reset_password}</a>
          </div>
        </Page>
      </React.Fragment>
    )
  }
}

Login.propTypes = {
  handleSubmit: PropTypes.func,
  loginRequest: PropTypes.func,
  login: PropTypes.shape({
    requesting: PropTypes.bool,
    successfull: PropTypes.bool,
    messages: PropTypes.array,
    errors: PropTypes.array,
  }),
}

// Grab only the peice of state we need state.signup name came from when we
// combined our reducers
const mapStateToProps = (state) => ({
  login: state.login,
  client: state.client,
})

const connected = connect(mapStateToProps, { loginRequest, loginFinish })(
  Login
)

const formed = reduxForm({ form: 'login' })(connected)

//export default formed
export default formed
