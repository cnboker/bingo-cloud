import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import Pager from '~/views/components/tables/Pager'
import Search from '~/views/components/forms/Search'
import resources from '../locale'
import Table from './table'
import RowFliter from './rowFliter'
import DeviceGroup from './groupLink'
import { requestDeviceList } from '../actions'
import { TagCatelog } from '../../tags/contants'
import { fetchTags } from '../../tags/actions'
import PageContainer from 'src/views/components/pageContainer'

export default () => {
  const dispatch = useDispatch()
  const deviceList = useSelector((state) => state.deviceListReducer)
  const { userName } = useSelector((state) => state.securityReducer)
  const PAGE_SIZE = 30
  const [tableData, setTableData] = useState({
    pageCount: 0,
    data: [],
  })

  const interval = 30 * 1000
  const [filter, setFilter] = useState({
    selectGroup: '',
    networkStatus: -1,
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
    setFilter({ ...filter, networkStatus: status.value })
  }

  const groupSelect = (selectGroup) => {
    setFilter({ ...filter, selectGroup })
  }

  const getTableData = (page = 0) => {
    let data = deviceList
    if (filter.networkStatus !== -1) {
      data = data.filter((item) => {
        return item.networkStatus === filter.networkStatus
      })
    }
    if (filter.selectGroup) {
      data = data.filter((item) => {
        return item.groupName === filter.selectGroup
      })
    }

    if (filter.keyword) {
      data = data.filter((item) => {
        const { name, deviceId, ip } = item
        return (name + deviceId + ip).indexOf(filter.keyword) !== -1
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
    <PageContainer>
      <div className="row mb-2">
        <div className="col-md-6">
          <DeviceGroup groupSelect={groupSelect} />
        </div>
        <div className="col-md-3">
          <Search onSearch={keywordFilter} />
        </div>
        <div className="col-md-3">
          <RowFliter statusChange={statusChange} defaultValue={filter.networkStatus} />
        </div>
      </div>
      <div className="table-responsive">
        <Table tableData={tableData.data} />
        <div className="float-right">
          <Pager pageCount={tableData.pageCount} onPageChange={pagination} />
        </div>
      </div>
    </PageContainer>
  )
}
