import React from 'react'
import resources from '../locale'
import GR from '~/locale'
import If from '~/lib/If'
import { Link } from 'react-router-dom'

export default ({ rowData, updateGroup, updateName, renewLicense, release }) => {
  //[checked, setChecked] = useState(false)
  const getMac = (val) => {
    if (!val) return ''
    if (val.length < 24) return val
    return val.substring(0, 24)
  }

  // const selected = (item, e) => {
  //   this.setState({ checked: e.target.checked })
  //   this.props.deviceSelected(item.deviceId, e.target.checked)
  // }

  return (
    <tr key={rowData.deviceId}>
      <td>{rowData.tenantUserName}</td>
      <td>
        <button
          className="btn-link"
          onClick={() => {
            updateGroup(rowData.deviceId, rowData.groupName)
          }}
        >
          {rowData.groupName || '-'}
        </button>
      </td>
      <td>
        <button
          className="btn-link"
          onClick={() => {
            updateName(rowData.deviceId, rowData.name)
          }}
        >
          {rowData.name || '-'}
        </button>
      </td>
      <td>{getMac(rowData.mac)}</td>
      <td>{rowData.ip}</td>
      <td style={rowData.value === 1 ? { color: 'green' } : { color: 'red' }}>
        {rowData.value === 1 ? GR.online : GR.offline}
      </td>
      <td style={!rowData.licenseExpired ? { color: 'green' } : { color: 'red' }}>
        {rowData.licenseExpired ? resources.invalid : resources.valid}
      </td>
      <td>{rowData.licenseRemark}</td>
      <td>
        <If test={rowData.licenseExpired && !rowData.isVM}>
          <button
            onClick={() => {
              renewLicense(rowData.deviceId)
            }}
            className="btn btn-success btn-sm"
          >
            {resources.authorize}
          </button>{' '}
        </If>{' '}
        <If test={rowData.isVM}>
          <button onClick={() => release(rowData.deviceId)} className="btn btn-default  btn-sm">
            {GR.delete}
          </button>
        </If>
        <Link to={`/device/details/${rowData.deviceId}`}> {resources.more}</Link>
      </td>
    </tr>
  )
}
