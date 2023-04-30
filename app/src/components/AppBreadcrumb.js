import React from 'react'
import { useLocation } from 'react-router-dom'
import routes from '../routes'
import G from '~/locale'
import { CBreadcrumb, CBreadcrumbItem } from '@coreui/react'

const AppBreadcrumb = () => {
  const currentLocation = useLocation().pathname
  const getRouteName = (pathname, routes) => {
    const currentRoute = routes.find((route) => route.path === pathname)

    if (!currentRoute) return null
    return currentRoute.name
  }

  const getBreadcrumbs = (location) => {
    const breadcrumbs = []
    location.split('/').reduce((prev, curr, index, array) => {
      const path = `${prev}/${curr}`
      const name = getRouteName(path, routes)
      if (name) {
        breadcrumbs.push({
          pathname: '#' + path,
          name,
          active: index + 1 === array.length ? true : false,
        })
        console.log('breadcrumbs', name, breadcrumbs, path)
      }
      return path
    })
    return breadcrumbs
  }

  const breadcrumbs = getBreadcrumbs(currentLocation)
  return (
    <CBreadcrumb className="m-0 ms-2">
      <CBreadcrumbItem href="/#">{G.home}</CBreadcrumbItem>
      {breadcrumbs.map((breadcrumb, index) => {
        return (
          <CBreadcrumbItem
            {...(breadcrumb.active ? { active: true } : { href: breadcrumb.pathname })}
            key={index}
          >
            {breadcrumb.name}
          </CBreadcrumbItem>
        )
      })}
    </CBreadcrumb>
  )
}

export default React.memo(AppBreadcrumb)
