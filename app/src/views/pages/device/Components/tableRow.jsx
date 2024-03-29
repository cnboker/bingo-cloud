import React from 'react'
import R from '../locale'
import G from '~/locale'
import If from '~/lib/If'
import { Link } from 'react-router-dom'
import { CLink, CButton } from '@coreui/react'
//recycle:设备回收
export default ({ rowData, updateGroup, updateName, updateLicense, deviceRecycle }) => {
  const getMac = (val) => {
    if (!val) return ''
    if (val.length < 24) return val
    return val.substring(0, 24)
  }

  return (
    <tr key={rowData.deviceId}>
      <td valign="middle">
        <CButton
          color="link"
          onClick={() => {
            updateGroup(rowData.deviceId, rowData.GroupName)
          }}
        >
          {rowData.groupName || '-'}
        </CButton>
      </td>
      <td valign="middle">
        <CButton
          color="link"
          onClick={() => {
            updateName(rowData.deviceId, rowData.name)
          }}
        >
          {rowData.name || '-'}
        </CButton>
      </td>
      <td valign="middle">
        <span className={rowData.networkStatus === 1 ? 'text-success' : 'text-danger'}>
          {rowData.networkStatus === 1 ? G.online : G.offline}
        </span>
      </td>
      <td valign="middle" style={!rowData.licenseExpired ? { color: 'geen' } : { color: 'red' }}>
        {rowData.licenseExpired ? R.invalid : `${R.valid}(${rowData.licenseRemark})`}
      </td>
      <td valign="middle">
        <If test={rowData.licenseExpired}>
          <CButton
            onClick={() => {
              updateLicense(rowData.deviceId)
            }}
            color="primary"
            variant="ghost"
          >
            {R.authorize}
          </CButton>{' '}
        </If>{' '}
        <CButton onClick={() => deviceRecycle(rowData.deviceId)} color="danger" variant="ghost">
          {G.delete}
        </CButton>{' '}
        <Link to={`/device/detail/${rowData.deviceId}`} color="info" variant="ghost">
          {R.more}
        </Link>
      </td>
    </tr>
  )
}
