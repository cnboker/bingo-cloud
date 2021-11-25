import React from 'react'
import G from './locale'
const Dashboard = React.lazy(() => import('./views/dashboard/Dashboard'))
const Users = React.lazy(() => import('./views/pages/admin/users/indexContainer'))
const Orders = React.lazy(() => import('./views/pages/orders/indexContainer'))
const OrderDetails = React.lazy(() => import('./views/pages/admin/orderDetails/indexContainer'))
const Wizard = React.lazy(() => import('./views/pages/steps/Index'))
const Trial = React.lazy(() => import('./views/pages/orderHandlers/Trial'))
const CreateOrder = React.lazy(() => import('./views/pages/orderHandlers/Create'))
const Checkout = React.lazy(() => import('./views/pages/orderHandlers/Checkout'))
const FileManager = React.lazy(() =>
  import('./views/pages/fileManager/Index').then((module) => ({
    default: module.ServerVFSBrowser,
  })),
)
const DeviceManager = React.lazy(() => import('./views/pages/device/Components/index'))
const Start = React.lazy(() => import('./views/start'))
const routes = [
  { path: '/', exact: true, name: G.home },
  { path: '/admin', exact: true, name: G.administrator, component: Users },
  { path: '/admin/users', exact: true, name: G.users, component: Users },
  { path: '/admin/orderDetails', exact: true, name: G.orderDetails, component: OrderDetails },
  { path: '/dashboard', name: G.dashboard, component: Dashboard },
  { path: '/quickStart', exact: true, name: G.quickStart, component: Wizard },
  { path: '/trial', name: G.trial, component: Trial },
  { path: '/orders', exact: true, name: G.orders, component: Orders },
  //二级链接必须增加一级route
  { path: '/orderHandlers', exact: true, name: G.orderProcess, component: Start },
  { path: '/orderHandlers/create', name: G.createOrder, component: CreateOrder },
  { path: '/orderHandlers/checkout', name: G.checkout, component: Checkout },
  { path: '/fileManager', exact: true, name: G.fileMange, component: FileManager },
  { path: '/device', exact: true, name: G.deviceManage, component: DeviceManager },
  { path: '/start', exact: true, name: 'start', component: Start },
]

export default routes
