import CIcon from '@coreui/icons-react'
import { cilSpeedometer, cilCart, cilUser, cilYen, cilFolder, cilDevices, cilInfo, cilCursor } from '@coreui/icons'
import { CNavItem, CNavGroup } from '@coreui/react'
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
  {
    component: CNavItem,
    name: G.deviceLogs,
    to: '/device/logs',
    icon: <CIcon icon={cilInfo} customClassName="nav-icon" />,
  },
  {
    component: CNavGroup,
    name: G.admin,
    to: '#',
    icon: <CIcon icon={cilCursor} customClassName="nav-icon" />,
    items: [
      {
        component: CNavItem,
        name: G.users,
        to: '/admin/users',
        icon: <CIcon icon={cilUser} customClassName="nav-icon" />,
        roles: 'admin',
      },
      {
        component: CNavItem,
        name: G.myorders,
        to: '/orders',
        icon: <CIcon icon={cilCart} customClassName="nav-icon" />,
      },
      {
        component: CNavItem,
        name: G.orders,
        to: '/admin/orderDetails',
        icon: <CIcon icon={cilYen} customClassName="nav-icon" />,
        roles: 'admin',
      },
    ],
  },
]

export default _nav
