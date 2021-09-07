import React from 'react'
import Form from 'react-jsonschema-form'
import resources from '../locale'
import { getEmailToken } from '../action'
import { useDispatch } from 'react-redux'

const schema = {
  title: resources.inputEmail,
  type: 'object',
  required: ['email'],
  properties: {
    email: {
      type: 'string',
      title: resources.email,
    },
  },
}

const uiSchema = {
  email: {
    'ui:widget': 'email',
  },
}

export default (props) => {
  const dispatch = useDispatch()
  const log = (type) => console.log.bind(console, type)

  const onSubmit = ({ formData }, e) => {
    e.preventDefault()

    dispatch(getEmailToken(formData.email))
  }

  return (
    <div className="container">
      <Form
        schema={schema}
        uiSchema={uiSchema}
        showErrorList={false}
        onSubmit={onSubmit}
        onChange={log('change')}
        onError={log('errors')}
      />
    </div>
  )
}
