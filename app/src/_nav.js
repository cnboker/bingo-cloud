import React from 'react'
import CIcon from '@coreui/icons-react'
import {
  cilSpeedometer,
  cilSpreadsheet,
  cilUser,
  cilYen,
  cilFolder,
  cilDevices,
} from '@coreui/icons'
import { CNavItem } from '@coreui/react'
import G from '~/locale'
const _nav = [
  {
    component: CNavItem,
    name: G.dashboard,
    to: '/dashboard',
    icon: <CIcon icon={cilSpeedometer} customClassName="nav-icon" />,
    badge: {
      color: 'info',
      text: G.new,
    },
  },
  {
    component: CNavItem,
    name: G.users,
    to: '/admin/users',
    icon: <CIcon icon={cilUser} customClassName="nav-icon" />,
    roles: 'admin',
  },
  {
    component: CNavItem,
    name: G.orders,
    to: '/orders',
    icon: <CIcon icon={cilSpreadsheet} customClassName="nav-icon" />,
    roles: 'admin',
  },
  {
    component: CNavItem,
    name: G.balance,
    to: '/admin/orderDetails',
    icon: <CIcon icon={cilYen} customClassName="nav-icon" />,
    roles: 'admin',
  },
  {
    component: CNavItem,
    name: G.fileManager,
    to: '/fileManager',
    icon: <CIcon icon={cilFolder} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: G.deviceManage,
    to: '/device',
    icon: <CIcon icon={cilDevices} customClassName="nav-icon" />,
  },
]

export default _nav
