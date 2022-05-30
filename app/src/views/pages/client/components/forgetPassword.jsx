import React from 'react'
import Form from 'react-jsonschema-form'
import resources from '../locale'
import { getEmailToken } from '../action'
import { useDispatch } from 'react-redux'
import Center from './CenterContainer'
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
  'ui:submitButtonProps': {
    showButton: true,
    buttonText: 'send',
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
    <Center>
      <Form
        schema={schema}
        uiSchema={uiSchema}
        showErrorList={false}
        onSubmit={onSubmit}
        onChange={log('change')}
        onError={log('errors')}
      >
        <button type="submit" className="btn btn-primary">
          Send
        </button>
      </Form>
    </Center>
  )
}
