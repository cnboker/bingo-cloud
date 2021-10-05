import React from 'react'
import CIcon from '@coreui/icons-react'
import { cilSpeedometer, cilSpreadsheet, cilStar, cilUser, cilYen, cilFolder } from '@coreui/icons'
import { CNavGroup, CNavItem, CNavTitle } from '@coreui/react'

const _nav = [
  {
    component: CNavItem,
    name: 'Dashboard',
    to: '/dashboard',
    icon: <CIcon icon={cilSpeedometer} customClassName="nav-icon" />,
    badge: {
      color: 'info',
      text: 'NEW',
    },
  },
  {
    component: CNavTitle,
    name: 'Administrator',
  },
  {
    component: CNavItem,
    name: 'Users',
    to: '/admin/users',
    icon: <CIcon icon={cilUser} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Orders',
    to: '/admin/orders',
    icon: <CIcon icon={cilSpreadsheet} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Balance',
    to: '/admin/orderDetails',
    icon: <CIcon icon={cilYen} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'FileManager',
    to: '/fileManager',
    icon: <CIcon icon={cilFolder} customClassName="nav-icon" />,
  },
]

export default _nav
