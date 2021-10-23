import React from 'react'
import CheckGroup from '~/views/components/forms/CheckGroup'
import { useParams } from 'react-router-dom'
import { DeviceStatusList } from '../constants'

export default ({ statusChange }) => {
  const { status } = useParams()

  return (
    <div className="float-right">
      <CheckGroup
        data={DeviceStatusList}
        name={'deviceStatus'}
        defaultValue={status || 0}
        onChecked={(value) => statusChange(value)}
      />
    </div>
  )
}
