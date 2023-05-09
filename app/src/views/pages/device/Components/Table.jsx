import React from 'react'
import { useSelector, useDispatch } from 'react-redux'
import * as Dialog from '~/views/components/dialog/Index'
import InputDialog from '~/views/components/dialog/InputDialog'
import { TagCatelog } from '~/views/pages/tags/contants'
import TableRow from './tableRow'
import R from '../locale'
import { GroupSelector } from './groupSelector'
import { renewLicense, deviceGroupUpdate, deviceUpdateName, deviceRecycle } from '../actions'

export default ({ tableData }) => {
  const tagReducer = useSelector((state) => state.tagReducer)
  const dispatch = useDispatch()
  const updateGroupName = (deviceId, oldName) => {
    var selectGroup = ''
    Dialog.show(
      {
        title: R.groupSelect,
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
        title: R.info,
        body: R.confirmInfo,
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
        title: R.info,
        body: (
          <InputDialog
            label={R.device_name}
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

  //delete device name
  const recycle = (id) => {
    Dialog.show(
      {
        title: R.info,
        body: R.confirmInfo,
      },
      () => {
        dispatch(deviceRecycle(id))
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
          deviceRecycle={recycle}
        />
      )
    })
  }
  return (
    <table className="table table-bordered table-striped table-sm">
      <thead>
        <tr>
          <th valign="middle">{R.group}</th>
          <th valign="middle">{R.device_name}</th>
          <th valign="middle">{R.device_status}</th>
          <th valign="middle">{R.license_info}</th>
          <th valign="middle"></th>
        </tr>
      </thead>
      <tbody>{renderList()}</tbody>
    </table>
  )
}
