import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import PropTypes from 'prop-types'
import { useSelector } from 'react-redux'
import { CBadge } from '@coreui/react'

export const AppSidebarNav = ({ items }) => {
  const location = useLocation()
  const { userName } = useSelector((state) => state.securityReducer)

  const navLink = (name, icon, badge) => {
    return (
      <>
        {icon && icon}
        {name && name}
        {badge && (
          <CBadge color={badge.color} className="ms-auto">
            {badge.text}
          </CBadge>
        )}
      </>
    )
  }

  const navItem = (item, index) => {
    const { component, name, badge, icon, roles, ...rest } = item
    const Component = component
    return (
      <React.Fragment key={index}>
        {(!roles || roles === userName) && (
          <Component
            {...(rest.to &&
              !rest.items && {
                component: NavLink,
                activeClassName: 'active',
              })}
            key={index}
            {...rest}
          >
            {navLink(name, icon, badge)}
          </Component>
        )}
      </React.Fragment>
    )
  }

  const navGroup = (item, index) => {
    const { component, name, icon, to, ...rest } = item
    const Component = component
    return (
      <Component idx={String(index)} key={index} toggler={navLink(name, icon)} visible={location.pathname.startsWith(to)} {...rest}>
        {item.items?.map((item, index) => (item.items ? navGroup(item, index) : navItem(item, index)))}
      </Component>
    )
  }

  return <React.Fragment>{items && items.map((item, index) => (item.items ? navGroup(item, index) : navItem(item, index)))}</React.Fragment>
}

AppSidebarNav.propTypes = {
  items: PropTypes.arrayOf(PropTypes.any).isRequired,
}
