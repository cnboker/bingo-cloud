import React from 'react'
import G from './locale'
const Dashboard = React.lazy(() => import('./views/dashboard/Dashboard'))
const Users = React.lazy(() => import('./views/pages/admin/users/indexContainer'))
const Orders = React.lazy(() => import('./views/pages/orders/indexContainer'))
const OrderDetails = React.lazy(() => import('./views/pages/admin/orderDetails/indexContainer'))
const Wizard = React.lazy(() => import('./views/pages/steps/Index'))
const Trial = React.lazy(() => import('./views/pages/orders/orderActions/Trial'))
const CreateOrder = React.lazy(() => import('./views/pages/orders/orderActions/Create'))
const Checkout = React.lazy(() => import('./views/pages/orders/orderActions/Checkout'))
const FileManager = React.lazy(() =>
  import('./views/pages/fileManager/Index').then((module) => ({
    default: module.ServerVFSBrowser,
  })),
)
const DeviceManager = React.lazy(() => import('./views/pages/device/Components/index'))
const DeviceLogs = React.lazy(() => import('./views/pages/device/Components/logs/Index'))
const Start = React.lazy(() => import('./views/start'))
const DeviceDetail = React.lazy(() => import('./views/pages/device/Components/details/Index'))
const routes = [
  { path: '/', exact: true, name: G.home },
  { path: '/dashboard', name: G.dashboard, component: Dashboard },
  { path: '/quickStart', exact: true, name: G.quickStart, component: Wizard },
  { path: '/trial', name: G.trial, component: Trial },
  { path: '/orders', exact: true, name: G.orders, component: Orders },
  //二级链接必须增加一级route
  { path: '/orders/create', name: G.createOrder, component: CreateOrder },
  { path: '/orders/checkout', name: G.checkout, component: Checkout },
  { path: '/fileManager', exact: true, name: G.fileMange, component: FileManager },
  { path: '/device', exact: true, name: G.deviceManage, component: DeviceManager },
  { path: '/device/logs', exact: true, name: G.deviceLogs, component: DeviceLogs },
  { path: '/device/detail', exact: true, name: G.deviceDetail, component: DeviceManager },
  { path: '/device/detail/:id', name: G.deviceDetail, component: DeviceDetail },
  { path: '/start', exact: true, name: 'start', component: Start },
  { path: '/admin', exact: true, name: G.admin, component: Users },
  { path: '/admin/users', exact: true, name: G.users, component: Users },
  { path: '/admin/orderDetails', exact: true, name: G.orderDetails, component: OrderDetails },
]

export default routes
