// the actual container component itself and all of the react goodness
import React, {Component} from 'react'
import PropTypes from 'prop-types'
import {reduxForm, Field, SubmissionError} from 'redux-form'
import {connect} from 'react-redux'
import signupRequest from './actions'
import {required, renderField, email, minLength6} from '~/utils/fieldLevelValidation'
import {Link} from "react-router-dom";
import resources from './locals'
import {Page, TitleBox, FormRowBlock} from '~/views/Components/Pages';
class Signup extends Component {

  // grab what we need from props.  The handleSubmit from ReduxForm and the pieces
  // of state from the global state.
  submit = (values) => {
    if (values.password !== values.repeatPassword) {
      throw new SubmissionError({repeatPassword: resources.password_mismatch, _error: resources.register_failure})
    }
    //console.log(values)
    this
      .props
      .signupRequest(values)
  }

  componentDidUpdate(preProps) {
    const {signup} = this.props;
    if (!signup.requesting && signup.successful) {
      this
        .props
        .history
        .push('/login')
    }
  }

  render() {
    const {handleSubmit} = this.props
    return (
      <Page>
        <TitleBox></TitleBox>
        <form onSubmit={handleSubmit(this.submit)} className="loginbackground">
          <Field
            name="userName"
            type="text"
            labelIcon="layui-icon-username"
            className="layui-input"
            component={renderField}
            placeholder={resources.user_account}
            validate={required}/>
          <Field
            name="email"
            type="text"
            labelIcon="layui-icon-email"
            className="layui-input"
            component={renderField}
            placeholder={resources.email}
            validate={[required, email]}/>
          <Field
            name="password"
            type="password"
            labelIcon="layui-icon-password"
            className="layui-input"
            component={renderField}
            placeholder={resources.password}
            validate={[required, minLength6]}/>
          <Field
            name="repeatPassword"
            type="password"
            labelIcon="layui-icon-password"
            className="layui-input"
            component={renderField}
            placeholder={resources.confirm_password}
            validate={[required, minLength6]}/>
          <FormRowBlock>
            <button action="submit" className="layui-btn">{resources.create}</button>
          </FormRowBlock>
          <form onSubmit={handleSubmit(this.submit)} className="loginbackground"></form>
          <div className="hrefs spaceBetween">
            <Link to="/login">
              {resources.login}
            </Link>

          </div>

        </form>
      </Page>
    )
  }

}

Signup.propTypes = {
  handleSubmit: PropTypes.func,
  signupRequest: PropTypes.func,
  signup: PropTypes.shape({requesting: PropTypes.bool, successfull: PropTypes.bool, messages: PropTypes.array, errors: PropTypes.array})
}

// Grab only the peice of state we need state.signup name came from when we
// combined our reducers
const mapStateToProps = state => ({signup: state.signup})

const connected = connect(mapStateToProps, {signupRequest})(Signup)

const formed = reduxForm({form: 'signup'})(connected)

export default formed