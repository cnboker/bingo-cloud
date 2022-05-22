import React from 'react'
import { useSelector, useDispatch } from 'react-redux'

import { CSidebar, CSidebarBrand, CSidebarNav, CSidebarToggler, CImage } from '@coreui/react'
import { AppSidebarNav } from './AppSidebarNav'

import logo from 'src/assets/images/logo.png'

import SimpleBar from 'simplebar-react'
import 'simplebar/dist/simplebar.min.css'

// sidebar nav config
import navigation from '../_nav'

const AppSidebar = () => {
  const dispatch = useDispatch()

  const { sidebarShow, sidebarUnfoldable } = useSelector((state) => state.siderBarReducer)
  return (
    <CSidebar
      position="fixed"
      unfoldable={sidebarUnfoldable}
      visible={sidebarShow}
      onHide={() => {
        dispatch({ type: 'set', sidebarShow: false })
      }}
    >
      <CSidebarBrand className="d-none d-md-flex" to="/">
        <CImage className="sidebar-brand-full" src={logo} width={120} />
        <CImage className="sidebar-brand-narrow" src={logo} width={50} />
      </CSidebarBrand>
      <CSidebarNav>
        <SimpleBar>
          <AppSidebarNav items={navigation} />
        </SimpleBar>
      </CSidebarNav>
      <CSidebarToggler
        className="d-none d-lg-flex"
        onClick={() => dispatch({ type: 'set', sidebarUnfoldable: !sidebarUnfoldable })}
      />
    </CSidebar>
  )
}

export default React.memo(AppSidebar)
