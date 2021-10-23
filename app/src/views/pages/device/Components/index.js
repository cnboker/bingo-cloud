import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import TableContainer from '~/views/components/tables/TableContainer'
import Pager from '~/views/components/tables/Pager'
import Search from '~/views/components/forms/Search'
import resources from '../locale'
import Table from './table'
import RowFliter from './rowFliter'
import DeviceGroup from './groupLink'
import { requestDeviceList } from '../actions'
import { TagCatelog } from '../../tags/contants'
import { fetchTags } from '../../tags/actions'

export default () => {
  const dispatch = useDispatch()
  const deviceList = useSelector((state) => state.deviceListReducer)
  const { userName } = useSelector((state) => state.securityReducer)
  const PAGE_SIZE = 30
  const [tableData, setTableData] = useState({
    pageCount: 0,
    data: [],
  })

  const interval = 3000 * 10
  const [filter, setFilter] = useState({
    selectGroup: '__all',
    deviceStatus: 0,
    keyword: '',
    page: 0,
  })

  useEffect(() => {
    dispatch(fetchTags(TagCatelog.deviceGroup))
    dispatch(requestDeviceList(userName))
  }, [])

  useEffect(() => {
    const timerId = setInterval(() => {
      dispatch(requestDeviceList(userName))
    }, interval)
    return () => clearInterval(timerId)
  }, [])

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    setTableData(getTableData())
  }, [deviceList, filter])

  const statusChange = (status) => {
    setFilter({ ...filter, deviceStatus: status })
  }

  const groupSelect = (selectGroup) => {
    setFilter({ ...filter, selectGroup })
  }

  const getTableData = (page = 0) => {
    let data = deviceList
    if (filter.deviceStatus > 0) {
      data = data.filter((item) => {
        return item.value === filter.deviceStatus
      })
    }
    if (filter.selectGroup === 'notset') {
      data = data.filter((item) => {
        return !item.group
      })
    } else if (filter.selectGroup !== '__all') {
      data = data.filter((item) => {
        return item.groupName === filter.selectGroup
      })
    }

    var currentIndex = page * PAGE_SIZE
    return {
      pageCount: Math.ceil(deviceList.length / PAGE_SIZE),
      data: data.slice(currentIndex, currentIndex + PAGE_SIZE),
    }
  }

  const pagination = (page) => {
    setFilter({ ...filter, page })
  }

  const keywordFilter = (keyword) => {
    setFilter({ ...filter, keyword })
  }

  return (
    <TableContainer title={resources.device_mgt}>
      <div className="row mb-2">
        <div className="col-md-3">
          <DeviceGroup deviceList={deviceList} groupSelect={groupSelect} />
        </div>
        <div className="col-md-6">
          <Search onKeywordChange={keywordFilter} />
        </div>
        <div className="col-md-3">
          <RowFliter statusChange={statusChange} deviceStatus={filter.deviceStatus} />
        </div>
      </div>
      <div className="table-responsive">
        <Table tableData={tableData.data} />
        <div className="float-right">
          <Pager pageCount={tableData.pageCount} onPageChange={pagination} />
        </div>
      </div>
    </TableContainer>
  )
}
