import React, { useState } from 'react'
import { CButton, CCard, CCardBody, CCardHeader } from '@coreui/react'
import DateSearchbar from 'src/views/components/forms/form-control/DateSearchbar'
import Table from 'src/views/components/tables/Table'
import { DateFormater, BooleanFormater } from 'src/views/components/tables/CellFormatter'
import Pager from 'src/views/components/tables/Pager'

export default (props) => {
  const { dataset, onSearch } = props
  const [query, setQuery] = useState({})
  return (
    <CCard>
      <CCardHeader component="h5">Users</CCardHeader>
      <CCardBody>
        <DateSearchbar
          onSearch={(q) => {
            setQuery(q)
            onSearch(q)
          }}
        />
        {/* eslint-disable-next-line @typescript-eslint/no-use-before-define*/}
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
      title: '用户名',
      columnName: 'tenantUserName',
    },
    {
      title: '订单编号',
      columnName: 'orderNo',
    },
    {
      title: '单价/天',
      columnName: 'price',
    },
    {
      title: '应收',
      columnName: 'subTotal',
    },
    {
      title: '实收',
      columnName: 'amount',
    },
    {
      title: '备注',
      columnName: 'remark',
    },
    {
      title: '付款状态',
      columnName: 'isPaid',
      formatter: BooleanFormater,
    },
    {
      title: '创建日期',
      columnName: 'createDate',
      formatter: DateFormater,
    },
    {
      title: '操作',
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      formatter: OperationButtons,
    },
  ]

  const data = [
    {
      tenantUserName: 'scott',
      orderNo: '2109030941579824',
      price: 0.5,
      subTotal: 720,
      amount: 0,
      reamrk: 'free',
      isPaid: true,
      createDate: '2020-09-21 11:01:46',
    },
  ]

  return { columnDefinition, data }
}

const OperationButtons = ({ data, onFreeOrder }) => {
  const { id } = data
  return <>{!data.isPaid && <CButton color="primary" onClick={() => onFreeOrder(id)}></CButton>}</>
}
