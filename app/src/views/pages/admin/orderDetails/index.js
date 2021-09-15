import React, { useState } from 'react'
import { CCard, CCardBody, CCardHeader } from '@coreui/react'
import DateSearchbar from 'src/views/components/forms/form-control/DateSearchbar'
import Table from 'src/views/components/tables/Table'
import { DateFormater } from 'src/views/components/tables/CellFormatter'
import Pager from 'src/views/components/tables/Pager'

export default (props) => {
  const { dataset, onSearch } = props
  const [query, setQuery] = useState({})
  return (
    <CCard>
      <CCardHeader component="h5">Balance</CCardHeader>
      <CCardBody>
        <DateSearchbar
          onSearch={(q) => {
            setQuery(q)
            onSearch(q)
          }}
        />
        <Table {...props} {...TableProps()} data={dataset.data} />
        <Pager
          pageCount={dataset.pageCount}
          onPageChange={(target) => onSearch({ ...query, page: target.selected })}
        />
      </CCardBody>
    </CCard>
  )
}

const TableProps = () => {
  const columnDefinition = [
    {
      title: '订单编号',
      columnName: 'orderNo',
    },
    {
      title: '交易前金额',
      columnName: 'beforeBalance',
    },

    {
      title: '交易后金额',
      columnName: 'afterBalance',
    },
    {
      title: '付款用户',
      columnName: 'fromUserName',
    },
    {
      title: '交易金额',
      columnName: 'amount',
    },
    {
      title: '交易类型',
      columnName: 'transType',
      formatter: transTypeFormater,
    },
    {
      title: '交易日期',
      columnName: 'transTime',
      formatter: DateFormater,
    },
    {
      title: '备注',
      columnName: 'remark',
    },
  ]

  const data = [
    {
      fromUserName: 'scott',
      orderNo: '2109030941579824',
      beforeBalance: 500,
      afterBalacne: 600,
      amount: 100,
      reamrk: 'order',
      transType: 0,
      createDate: '2020-09-21 11:01:46',
    },
  ]

  return { columnDefinition, data }
}

const transTypeFormater = ({ val }) => {
  return val === 0 ? '订单' : '佣金'
}
