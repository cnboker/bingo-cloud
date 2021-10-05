// eslint-disable-next-line no-use-before-define
import React from 'react'
import { CButton, CCard, CCardBody, CCardHeader } from '@coreui/react'
import SimpleSearchbar from 'src/views/components/forms/form-control/SimpleSearchbar'
import Table from 'src/views/components/tables/Table'
import { DateFormater } from 'src/views/components/tables/CellFormatter'
import { DateTimeFormater } from 'src/views/components/tables/CellFormatter'
import Pager from 'src/views/components/tables/Pager'

export default (props) => {
  const { dataset, onSearch, pagination } = props

  return (
    <CCard>
      <CCardHeader component="h5">Users</CCardHeader>
      <CCardBody>
        <SimpleSearchbar onSearch={onSearch} />
        {/* eslint-disable-next-line @typescript-eslint/no-use-before-define*/}
        <Table {...props} {...TableProps()} data={dataset.data} />
        <Pager pageCount={dataset.pageCount} onPageChange={pagination} />
      </CCardBody>
    </CCard>
  )
}

const TableProps = () => {
  const columnDefinition = [
    {
      title: '用户名',
      columnName: 'userName',
    },
    {
      title: '用户类型',
      columnName: 'isAgent',
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      formatter: IsAgentFormatter, //NameUpdateButton
    },
    {
      title: 'Email',
      columnName: 'email',
    },

    {
      title: '创建日期',
      columnName: 'createDate',
      formatter: DateFormater,
    },
    {
      title: '最近登录日期',
      columnName: 'lastLoginTime',
      formatter: DateTimeFormater,
    },
    {
      title: '操作',
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      formatter: OperationButtons,
      //width: 200,
    },
  ]

  const data = [
    {
      userName: 'scott',
      isAgent: true,
      email: '6348816@qq.com',
      createDate: '2020-09-21 11:01:46',
      lastLoginTime: '2020-09-25 11:01:46',
    },
  ]

  return { columnDefinition, data }
}

const OperationButtons = ({ data, onDelete, setAgent }) => {
  const { userName } = data
  console.log('username', userName, onDelete)
  return (
    <>
      {data.isAgent && (
        <CButton color="primary" onClick={() => setAgent(userName)}>
          降级为普通会员
        </CButton>
      )}
      {!data.isAgent && (
        <CButton color="primary" onClick={() => setAgent(userName)}>
          升级为代理商
        </CButton>
      )}
      <CButton color="danger" onClick={() => onDelete(userName)}>
        删除
      </CButton>
    </>
  )
}

const IsAgentFormatter = ({ val }) => {
  return <span>{val ? '代理商' : '会员'}</span>
}
