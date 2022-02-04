import React from 'react'
import CheckGroup from '~/views/components/forms/CheckGroup'
import { NetworkStatusList } from '../constants'

export default ({ statusChange, defaultValue }) => {
  //const { status } = useParams()

  return (
    <div className="float-right">
      <CheckGroup
        data={NetworkStatusList}
        name={'networkStatus'}
        defaultValue={defaultValue || -1}
        onChecked={(value) => statusChange(value)}
      />
    </div>
  )
}
