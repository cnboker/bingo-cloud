import React, { lazy, useEffect, useState } from 'react'
import DeviceLogs from './DeviceLogs'
import PlayStats from './PlayStats'
import { homeRequest } from './action'
import { useDispatch, useSelector } from 'react-redux'
const WidgetsDropdown = lazy(() => import('../components/widgets/WidgetsDropdown.js'))

const Dashboard = () => {
  const { basicInfo, playStats, deviceLogsStats } = useSelector((state) => state.homeReducer)
  const dispatch = useDispatch()

  useEffect(() => {
    dispatch(homeRequest())
  }, [])

  return (
    <>
      <WidgetsDropdown data={basicInfo} />
      <PlayStats data={playStats} />
      <DeviceLogs data={deviceLogsStats} />
    </>
  )
}

export default Dashboard
