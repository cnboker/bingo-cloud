import React from 'react'
import resources from '../locale'
import GR from '~/locale'
import If from '~/lib/If'
import { Link } from 'react-router-dom'
import { CButton } from '@coreui/react'

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
          color="primary"
          onClick={() => {
            updateGroup(rowData.deviceId, rowData.groupName)
          }}
        >
          {rowData.groupName || '---'}
        </CButton>
      </td>
      <td>
        <CButton
          color="link"
          onClick={() => {
            updateName(rowData.deviceId, rowData.name)
          }}
        >
          {rowData.name || '---'}
        </CButton>
      </td>
      <td>{getMac(rowData.mac)}</td>
      <td>{rowData.ip}</td>
      <td style={rowData.networkStatus === 1 ? { color: 'green' } : { color: 'red' }}>
        {rowData.networkStatus === 1 ? GR.online : GR.offline}
      </td>
      <td style={!rowData.licenseExpired ? { color: 'green' } : { color: 'red' }}>
        {rowData.licenseExpired ? resources.invalid : resources.valid}
      </td>
      <td>{rowData.licenseRemark}</td>
      <td>
        <If test={rowData.licenseExpired}>
          <CButton
            onClick={() => {
              updateLicense(rowData.deviceId)
            }}
            color="primary"
          >
            {resources.authorize}
          </CButton>{' '}
        </If>{' '}
        <CButton onClick={() => release(rowData.deviceId)} color="danger">
          {GR.delete}
        </CButton>
        <Link to={`/device/details/${rowData.deviceId}`} color="Info">
          {resources.more}
        </Link>
      </td>
    </tr>
  )
}
