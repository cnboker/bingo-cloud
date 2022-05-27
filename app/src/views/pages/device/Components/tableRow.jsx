import React from 'react'
import R from '../locale'
import G from '~/locale'
import If from '~/lib/If'
import { Link } from 'react-router-dom'
import { CLink, CButton } from '@coreui/react'

export default ({ rowData, updateGroup, updateName, updateLicense, release }) => {
  const getMac = (val) => {
    if (!val) return ''
    if (val.length < 24) return val
    return val.substring(0, 24)
  }

  return (
    <tr key={rowData.deviceId}>
      <td>
        <CButton
          color="link"
          onClick={() => {
            updateGroup(rowData.deviceId, rowData.GroupName)
          }}
        >
          {rowData.GroupName || '/'}
        </CButton>
      </td>
      <td>
        <CButton
          color="link"
          onClick={() => {
            updateName(rowData.deviceId, rowData.name)
          }}
        >
          {rowData.name || '/'}
        </CButton>
      </td>
      <td>{getMac(rowData.mac)}</td>
      <td style={rowData.networkStatus === 1 ? { color: 'Geen' } : { color: 'red' }}>
        {rowData.networkStatus === 1 ? G.online : G.offline}
      </td>
      <td style={!rowData.licenseExpired ? { color: 'Geen' } : { color: 'red' }}>
        {rowData.licenseExpired ? R.invalid : `${R.valid}(${rowData.licenseRemark})`}
      </td>
      <td>
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
        <CButton onClick={() => release(rowData.deviceId)} color="danger" variant="ghost">
          {G.delete}
        </CButton>{' '}
        <Link to={`/device/detail/${rowData.deviceId}`} color="info" variant="ghost">
          {R.more}
        </Link>
      </td>
    </tr>
  )
}
