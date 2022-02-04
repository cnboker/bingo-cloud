import React, { useState } from 'react'
import { CButton } from '@coreui/react'
import DateSearchbar from 'src/views/components/forms/form-control/DateSearchbar'
import Table from 'src/views/components/tables/Table'
import {
  DateFormater,
  BooleanFormater,
  PriceFormater,
} from 'src/views/components/tables/CellFormatter'
import Pager from 'src/views/components/tables/Pager'
import PageContainer from 'src/views/components/pageContainer'
import { useSelector } from 'react-redux'
export default (props) => {
  const { dataset, onSearch } = props
  const [query, setQuery] = useState({})
  const client = useSelector((state) => state.securityReducer)
  return (
    <PageContainer>
      <DateSearchbar
        onSearch={(q) => {
          setQuery(q)
          onSearch(q)
        }}
      />
      {/* eslint-disable-next-line @typescript-eslint/no-use-before-define*/}
      <Table {...props} {...TableProps(client)} data={dataset.data} />
      <Pager
        pageCount={dataset.pageCount}
        onPageChange={(target) => onSearch({ ...query, page: target.selected })}
      />
    </PageContainer>
  )
}

const TableProps = (client) => {
  const columnDefinition = [
    {
      title: '用户名',
      columnName: 'userName',
      visiable: client.userName === 'admin',
    },
    {
      title: '订单编号',
      columnName: 'orderNo',
    },
    {
      title: '单价/天',
      columnName: 'price',
      formatter: PriceFormater,
    },
    {
      title: '应收',
      columnName: 'subTotal',
      formatter: PriceFormater,
      visiable: client.userName === 'admin',
    },
    {
      title: '实收',
      columnName: 'amount',
      formatter: PriceFormater,
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
      width: 200,
    },
  ]

  const data = [
    {
      userName: 'scott',
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

const OperationButtons = ({ data, onFreeOrder, onDelete }) => {
  const { id, userName } = data
  return (
    <>
      {!data.isPaid && userName === 'admin' && (
        <CButton color="primary" onClick={() => onFreeOrder(id)}>
          Free
        </CButton>
      )}
      {!data.isPaid && (
        <CButton
          color="danger"
          onClick={() => {
            onDelete(id)
          }}
        >
          Delete
        </CButton>
      )}
    </>
  )
}
