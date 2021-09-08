import React from 'react'
import {RowContainer} from '../../../components/Forms/RowContainer'
import resources from '../locale'

export default DeviceGroupSelector = ({groupName, groupList, onSelect}) => (
  <React.Fragment>
    <RowContainer label={resources.selectedDevices}>
      {groupName}
    </RowContainer>
    <RowContainer label={resources.group}>
    <div className="ddl">
      <Select
        placeholder={resources.group}
        onChange={onSelect}
        options={groupList
        .split(',')
        .map(x => {
          return {label: x, value: x}
        })}/></div>
    </RowContainer>
  </React.Fragment>
)
