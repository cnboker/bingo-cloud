import { NavLink } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import {
  CContainer,
  CHeader,
  CHeaderBrand,
  CHeaderDivider,
  CHeaderNav,
  CHeaderToggler,
  CNavLink,
  CNavItem,
  CImage,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilLibrary, cilDevices, cilMenu, cilCart } from '@coreui/icons'
import { AppBreadcrumb } from './index'
import { AppHeaderDropdown } from './header/index'
import logo from 'src/assets/images/logo.png'
import R from './locale'
import AccountSwitcher from './AccountSwitcher'

const AppHeader = () => {
  const dispatch = useDispatch()
  const { sidebarShow } = useSelector((state) => state.siderBarReducer)
  const client = useSelector((state) => state.securityReducer)
  return (
    <CHeader position="sticky" className="mb-4">
      <CContainer fluid>
        <CHeaderToggler
          className="ps-1"
          onClick={() => dispatch({ type: 'set', sidebarShow: !sidebarShow })}
        >
          <CIcon icon={cilMenu} size="lg" />
        </CHeaderToggler>
        <CHeaderBrand className="mx-auto d-md-none" to="/">
          <CImage src={logo} height={48} alt="Logo" />
        </CHeaderBrand>
        <CHeaderNav className="d-none d-md-flex me-auto">
          <CNavItem>
            <CNavLink to="/dashboard" component={NavLink} activeClassName="active">
              {R.dashboard}
            </CNavLink>
          </CNavItem>
          <CNavItem>
            <CNavLink href="/#quickStart">{R.quickStart}</CNavLink>
          </CNavItem>
        </CHeaderNav>
        <CHeaderNav>
          <CNavItem>
            <CNavLink href="#/orders/create">
              <CIcon icon={cilCart} size="lg" title={R.cart} />
            </CNavLink>
          </CNavItem>
          <CNavItem>
            <CNavLink href="/#fileManager">
              <CIcon icon={cilLibrary} size="lg" title={R.fileManage} />
            </CNavLink>
          </CNavItem>
          <CNavItem>
            <CNavLink href="/#device">
              <CIcon icon={cilDevices} size="lg" title={R.deviceMange} />
            </CNavLink>
          </CNavItem>
          {client.agentToken && (
            <CNavItem>
              <AccountSwitcher />
            </CNavItem>
          )}
        </CHeaderNav>
        <CHeaderNav className="ms-3">
          <AppHeaderDropdown userName={client.userName} />
        </CHeaderNav>
      </CContainer>
      <CHeaderDivider />
      <CContainer fluid>
        <AppBreadcrumb />
      </CContainer>
    </CHeader>
  )
}

export default AppHeader
