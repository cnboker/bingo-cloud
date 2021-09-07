import React from 'react'
import Form from 'react-jsonschema-form'
import resources from '../locale'
import { resetPassword } from '../action'
import { useDispatch } from 'react-redux'

const schema = {
  title: resources.resetPassword,
  type: 'object',
  required: ['newPassword', 'repeatPassword'],
  properties: {
    newPassword: {
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
  newPassword: {
    'ui:widget': 'password',
  },
  repeatPassword: {
    'ui:widget': 'password',
  },
}

const log = (type) => console.log.bind(console, type)

export default (props) => {
  const queryString = require('query-string')
  const { token, email } = queryString.parse(props.location.search)

  const dispatch = useDispatch()

  const validate = (formData, errors) => {
    if (formData.newPassword !== formData.repeatPassword) {
      errors.repeatPassword.addError(resources.passwordNotMatch)
    }
    return errors
  }

  const onSubmit = ({ formData }, e) => {
    e.preventDefault()
    dispatch(resetPassword({ token, email, ...formData }))
  }

  return (
    <div className="container">
      <Form
        schema={schema}
        uiSchema={uiSchema}
        showErrorList={false}
        onChange={log('change')}
        onSubmit={onSubmit}
        onError={log('errors')}
        formData={{}}
        validate={validate}
      />
    </div>
  )
}
