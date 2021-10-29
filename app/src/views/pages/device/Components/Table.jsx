import React from 'react'
import { useSelector, useDispatch } from 'react-redux'
import * as Dialog from '~/views/components/dialog/Index'
import InputDialog from '~/views/components/dialog/InputDialog'
import { TagCatelog } from '~/views/pages/tags/contants'
import TableRow from './tableRow'
import resources from '../locale'
import { GroupSelector } from './groupSelector'
import { renewLicense, deviceGroupUpdate, deviceUpdateName } from '../actions'

export default ({ tableData }) => {
  const tagReducer = useSelector((state) => state.tagReducer)
  const dispatch = useDispatch()
  const updateGroupName = (deviceId, oldName) => {
    var selectGroup = ''
    Dialog.show(
      {
        title: resources.groupSetting,
        body: (
          <GroupSelector
            groupName={oldName}
            groupList={tagReducer[TagCatelog.deviceGroup]}
            onSelect={(g) => (selectGroup = g.value)}
          />
        ),
      },
      () => {
        dispatch(deviceGroupUpdate(deviceId, selectGroup))
      },
    )
  }

  const updateLicense = (id) => {
    Dialog.show(
      {
        title: resources.info,
        body: resources.confirmInfo,
      },
      () => {
        dispatch(renewLicense(id))
      },
    )
  }

  //update device name
  const updateName = (deviceId, oldName) => {
    var newName = oldName

    Dialog.show(
      {
        title: resources.info,
        body: (
          <InputDialog
            label={resources.device_name}
            value={oldName}
            inputchange={(val) => {
              newName = val
            }}
          />
        ),
      },
      () => {
        dispatch(deviceUpdateName(deviceId, newName))
      },
    )
  }

  const renderList = () => {
    return tableData.map((item, key) => {
      return (
        <TableRow
          key={key}
          rowData={item}
          updateGroup={updateGroupName}
          updateLicense={updateLicense}
          updateName={updateName}
        />
      )
    })
  }
  return (
    <table className="table table-bordered table-striped table-sm">
      <thead>
        <tr>
          <th>{resources.group}</th>
          <th>{resources.device_name}</th>
          <th>MAC</th>
          <th>IP</th>
          <th>{resources.device_status}</th>
          <th>{resources.license_info}</th>
          <th>{resources.remark}</th>
          <th></th>
        </tr>
      </thead>
      <tbody>{renderList()}</tbody>
    </table>
  )
}
