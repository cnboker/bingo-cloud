import React from 'react'
import { RowContainer } from '~/views/components/forms/RowContainer'
import Select from 'react-select'
import resources from '../locale'

export const GroupSelector = ({ groupName, groupList, onSelect }) => (
  <React.Fragment>
    <RowContainer label={resources.selectedDevices}>{groupName}</RowContainer>
    <RowContainer label={resources.group}>
      <Select
        placeholder={resources.group}
        onChange={onSelect}
        options={groupList.map((x) => {
          return { label: x, value: x }
        })}
      />
    </RowContainer>
  </React.Fragment>
)
