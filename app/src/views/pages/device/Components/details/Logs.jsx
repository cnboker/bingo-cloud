import React, { useEffect } from 'react'
//redux hook
import { useDispatch, useSelector } from 'react-redux'
import { getDeviceLogs } from '../../actions'
import DeviceLogToolbar from './LogToolbar'
import Pager from 'src/views/components/tables/Pager'
import G from '~/locale'
import { toShortDateTime } from '~/lib/string'

export default () => {
  const logTypeList = ['message', 'warning', 'fatal']

  const { deviceListReducer, deviceLogReducer } = useSelector((state) => state)
  const deviceOptions = deviceListReducer.map((x) => {
    return { label: x.name, value: x.deviceId }
  })
  const { records } = deviceLogReducer
  //same as mapDispatchToProps
  const dispatch = useDispatch()
  let query = {}

  const renderList = () => {
    return records.map((item, index) => {
      return (
        <tr key={index}>
          <td>{item.Name}</td>
          <td>{G[logTypeList[item.MessageType]]}</td>
          <td>{item.IP}</td>
          <td>{toShortDateTime(item.UpdateDate)}</td>
          <td>{item.Message}</td>
        </tr>
      )
    })
  }

  const onSearch = (query) => {
    dispatch(getDeviceLogs(query))
  }

  const pagination = (data) => {
    query.page = data.selected
    dispatch(getDeviceLogs(query))
  }

  return (
    <div>
      <DeviceLogToolbar onSearch={onSearch} deviceOptions={deviceOptions} />
      <br />
      <div className="table-responsive">
        <table className="table table-bordered table-striped table-sm">
          <thead>
            <tr>
              <th>{G.name}</th>
              <th>{G.messageType}</th>
              <th>{G.ip}</th>
              <th>{G.createDate}</th>
              <th>{G.message}</th>
            </tr>
          </thead>
          <tbody>{renderList()}</tbody>
        </table>
        <br />
        <div className="float-right">
          <Pager pageCount={deviceLogReducer.pageCount} onPageChange={pagination} />
        </div>
      </div>
    </div>
  )
}
