import React, { useEffect } from 'react'
import Form from 'react-jsonschema-form'
import resources from '../locale'
import { getUserExtender, updateUserExtender } from '../action'
import { useDispatch, useSelector } from 'react-redux'

const schema = {
  title: resources.communicationSettings,
  type: 'object',
  properties: {
    email: {
      type: 'string',
      title: resources.email,
    },
    mobile1: {
      type: 'string',
      title: resources.cmsMobile,
    },
    mobile2: {
      type: 'string',
      title: resources.emsMobile,
    },
  },
}

export default (props) => {
  const { client } = useSelector((state) => state)
  const dispatch = useDispatch()
  const log = (type) => console.log.bind(console, type)

  useEffect(() => {
    if (!client.setting) {
      client.setting = {}
      dispatch(getUserExtender())
    }
  }, [])

  const onSubmit = ({ formData }, e) => {
    e.preventDefault()
    console.log('onsubmit', formData)
    dispatch(
      updateUserExtender({
        ...(client.setting || {}),
        ...formData,
      }),
    )
  }

  return (
    <div>
      <Form
        schema={schema}
        formData={client.userSetting || {}}
        showErrorList={false}
        onSubmit={onSubmit}
        onChange={log('change')}
        onError={log('errors')}
      />
    </div>
  )
}
