import React from 'react'
import { RowContainer } from '../../../components/forms/RowContainer'
import resources from '../locale'
import Select from 'src/views/components/forms/input-group/InputGroup'

export default ({ groupName, groupList, onSelect }) => (
  <React.Fragment>
    <RowContainer label={resources.selectedDevices}>{groupName}</RowContainer>
    <RowContainer label={resources.group}>
      <div className="ddl">
        <Select
          placeholder={resources.group}
          onChange={onSelect}
          options={groupList.split(',').map((x) => {
            return { label: x, value: x }
          })}
        />
      </div>
    </RowContainer>
  </React.Fragment>
)
