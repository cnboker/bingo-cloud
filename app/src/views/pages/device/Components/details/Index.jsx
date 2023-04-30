import React, { useState } from 'react'
import R from '../../locale'
import { HashRouter, Switch, useRouteMatch, useParams } from 'react-router-dom'
import ScreenCap from './ScreenCap'
import { DownloadProgress } from './DownloadProgress'
import DeviceInfo from './Intro'
import { PrivateRoute } from '~/lib/check-auth'
import { useSelector } from 'react-redux'
import { CNav, CNavItem } from '@coreui/react'
import PageContainer from 'src/views/components/pageContainer'
import { Link } from 'react-router-dom'

const navs = (match) => [
  {
    url: `${match.url}`,
    text: R.deviceMonitor,
  },
  {
    url: `${match.url}/screen`,
    text: R.deviceScreenCap,
  },
  {
    url: `${match.url}/downloadProgress`,
    text: R.downlaodProgress,
  },
]

export default () => {
  let match = useRouteMatch()
  let { id } = useParams()
  const navlist = navs(match)
  const [activeIndex, setActiveIndex] = useState(0)
  const curDeviceInfo = useSelector((state) =>
    state.deviceListReducer.find((c) => c.deviceId === id),
  )
  const createNavs = (activeIndex, navs) => {
    return (
      <CNav variant="tabs">
        {navs.map((x, index) => {
          return (
            <CNavItem key={index}>
              {activeIndex === index && (
                <Link to={x.url} className="nav-link active">
                  {x.text}
                </Link>
              )}
              {activeIndex !== index && (
                <Link to={x.url} className="nav-link" onClick={() => setActiveIndex(index)}>
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
        <nav className="navbar navbar-light bg-light mb-1">{createNavs(activeIndex, navlist)}</nav>
        <Switch>
          <div className="mt-4">
            <PrivateRoute
              path={`${match.path}/screen`}
              component={() => {
                return <ScreenCap deviceId={id} />
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
              exact
              component={() => {
                return <DeviceInfo deviceInfo={curDeviceInfo} />
              }}
            />
          </div>
        </Switch>
      </HashRouter>
    </PageContainer>
  )
}
