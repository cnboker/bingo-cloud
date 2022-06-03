import React from 'react'
import R from '../../locale'
import { HashRouter, Switch, useRouteMatch, useParams } from 'react-router-dom'
import DeviceLogs from './Logs'
import ScreenCap from './ScreenCap'
import { DownloadProgress } from './DownloadProgress'
import DeviceInfo from './Intro'
import { PrivateRoute } from '~/lib/check-auth'
import { useSelector } from 'react-redux'
import { CNav, CNavItem } from '@coreui/react'
import PageContainer from 'src/views/components/pageContainer'
import { Link } from 'react-router-dom'

export default () => {
  let match = useRouteMatch()
  let { id } = useParams()
  console.log('match.url', match.url)
  const curDeviceInfo = useSelector((state) =>
    state.deviceListReducer.find((c) => c.deviceId === id),
  )
  const navs = [
    {
      url: `${match.url}`,
      text: R.deviceMonitor,
    },
    {
      url: `${match.url}/screen`,
      text: R.deviceScreenCap,
    },
    {
      url: `${match.url}/logs`,
      text: R.deviceLogs,
    },
    {
      url: `${match.url}/downloadProgress`,
      text: R.downlaodProgress,
    },
  ]

  const createNavs = (activeIndex) => {
    return (
      <CNav>
        {navs.map((x, index) => {
          return (
            <CNavItem key={index}>
              {activeIndex === index && (
                <Link to={x.url} className="nav-link active">
                  {x.text}
                </Link>
              )}
              {activeIndex !== index && (
                <Link to={x.url} className="nav-link">
                  {x.text}
                </Link>
              )}
            </CNavItem>
          )
        })}
      </CNav>
    )
  }
  return (
    <PageContainer>
      {/* 系统统一采用hashroute */}
      <HashRouter>
        <nav className="navbar navbar-light bg-light mb-1">{createNavs(0)}</nav>
        <Switch>
          <PrivateRoute
            path={`${match.path}/screen`}
            component={() => {
              return <ScreenCap deviceId={id} />
            }}
          />
          <PrivateRoute
            path={`${match.path}/logs`}
            component={() => {
              return <DeviceLogs deviceId={id} />
            }}
          />
          <PrivateRoute
            path={`${match.path}/downloadProgress`}
            component={() => {
              return <DownloadProgress id={id} />
            }}
          />
          <PrivateRoute
            path={`${match.path}`}
            component={() => {
              return <DeviceInfo deviceInfo={curDeviceInfo} />
            }}
          />
        </Switch>
      </HashRouter>
    </PageContainer>
  )
}
