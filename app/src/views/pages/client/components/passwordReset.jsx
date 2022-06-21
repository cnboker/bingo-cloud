import React from 'react'
import Form from 'react-jsonschema-form'
import resources from '../locale'
import { resetPassword } from '../action'
import { useDispatch } from 'react-redux'
import queryString from 'query-string'
import Center from './CenterContainer'
import { Link } from 'react-router-dom'
const schema = {
  title: resources.resetPassword,
  type: 'object',
  required: ['password', 'repeatPassword'],
  properties: {
    password: {
      type: 'string',
      title: resources.newPassword,
      minLength: 6,
    },
    repeatPassword: {
      type: 'string',
      title: resources.repeatPassword,
      minLength: 6,
    },
  },
}

const uiSchema = {
  password: {
    'ui:widget': 'password',
  },
  repeatPassword: {
    'ui:widget': 'password',
  },
}

const log = (type) => console.log.bind(console, type)

export default (props) => {
  const { token, email } = queryString.parse(props.location.search)

  const dispatch = useDispatch()

  const validate = (formData, errors) => {
    if (formData.password !== formData.repeatPassword) {
      errors.repeatPassword.addError(resources.passwordNotMatch)
    }
    return errors
  }

  const onSubmit = ({ formData }, e) => {
    e.preventDefault()
    dispatch(resetPassword({ token, email, ...formData }))
  }

  return (
    <Center>
      <Form
        schema={schema}
        uiSchema={uiSchema}
        showErrorList={false}
        onChange={log('change')}
        onSubmit={onSubmit}
        onError={log('errors')}
        formData={{}}
        validate={validate}
      >
        <button type="submit" className="btn btn-primary">
          Submit
        </button>
        {'  '}
        <Link to="/#login">Return to Login</Link>
      </Form>
    </Center>
  )
}
