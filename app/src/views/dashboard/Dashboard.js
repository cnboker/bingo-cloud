import React, { lazy, useEffect, useState } from 'react'
import DeviceLogs from './DeviceLogs'
import PlayStats from './PlayStats'
import { asyncGet } from '~/lib/api'
const WidgetsDropdown = lazy(() => import('../components/widgets/WidgetsDropdown.js'))

const Dashboard = () => {
  const homeUrl = `${process.env.REACT_APP_SERVICE_URL}/api/home/index`
  const [data, setData] = useState(null)
  useEffect(() => {
    asyncGet({
      url: homeUrl,
    }).then((res) => {
      setData(res.data)
    })
  }, [])
  if (!data) return null
  return (
    <>
      <WidgetsDropdown data={data.basicInfo} />
      <PlayStats data={data.playStats} />
      <DeviceLogs data={data.deviceLogsStats} />
    </>
  )
}

export default Dashboard
