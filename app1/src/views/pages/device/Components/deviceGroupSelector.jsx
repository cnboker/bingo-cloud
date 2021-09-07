import React from 'react'
import {RowContainer} from '../../../components/Forms/RowContainer'
import Select from 'react-select' 
import resources from '../locale'

export const DeviceGroupSelector = ({groupName, groupList, onSelect}) => (
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
