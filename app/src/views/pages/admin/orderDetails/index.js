import React, { useState } from 'react'
import { CCard, CCardBody, CCardHeader } from '@coreui/react'
import DateSearchbar from 'src/views/components/forms/form-control/DateSearchbar'
import Table from 'src/views/components/tables/Table'
import { DateFormater } from 'src/views/components/tables/CellFormatter'
import Pager from 'src/views/components/tables/Pager'
import PageContainer from 'src/views/components/pageContainer'

export default (props) => {
  const { dataset, onSearch } = props
  const [query, setQuery] = useState({})
  return (
    <PageContainer>
      <DateSearchbar
        onSearch={(q) => {
          setQuery(q)
          onSearch(q)
        }}
      />
      {/*eslint-disable-next-line @typescript-eslint/no-use-before-define*/}
      <Table {...props} {...TableProps()} data={dataset.data} />
      <Pager
        pageCount={dataset.pageCount}
        onPageChange={(target) => onSearch({ ...query, page: target.selected })}
      />
    </PageContainer>
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
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
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
