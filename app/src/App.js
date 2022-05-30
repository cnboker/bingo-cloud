import React from 'react'
import { HashRouter, Route, Switch } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import './scss/style.scss'
//import '@coreui/coreui/dist/css/coreui.min.css'
import { PrivateRoute } from '~/lib/check-auth'
const loading = (
  <div className="pt-3 text-center">
    <div className="sk-spinner sk-spinner-pulse"></div>
  </div>
)

// Containers
const DefaultLayout = React.lazy(() => import('./layout/DefaultLayout'))

// Pages
const Login = React.lazy(() => import('./views/pages/login/index'))
const Logout = React.lazy(() => import('./views/pages/Logout'))
const Register = React.lazy(() => import('./views/pages/signup/index'))
const Page404 = React.lazy(() => import('./views/pages/page404/Page404'))
const Page500 = React.lazy(() => import('./views/pages/page500/Page500'))
const Authorize = React.lazy(() => import('./views/pages/authorize/index'))
const ForgetPassword = React.lazy(() => import('./views/pages/client/components/forgetPassword'))
const PasswordReset = React.lazy(() => import('./views/pages/client/components/passwordReset'))
export default () => {
  const dispatch = useDispatch()

  return (
    <HashRouter>
      <React.Suspense fallback={loading}>
        <Switch>
          <Route exact path="/login" name="Login Page" render={(props) => <Login {...props} />} />
          <Route exact path="/logout" name="Logout" render={(props) => <Logout {...props} />} />
          <Route
            exact
            path="/forgetPassword"
            name="forgetPassword"
            render={(props) => <ForgetPassword {...props} />}
          />
          <Route
            path="/passwordReset"
            name="passwordreset"
            render={(props) => <PasswordReset {...props} />}
          />
          <Route
            exact
            path="/register"
            name="Register Page"
            render={(props) => <Register {...props} />}
          />
          <Route exact path="/404" name="Page 404" render={(props) => <Page404 {...props} />} />
          <Route exact path="/500" name="Page 500" render={(props) => <Page500 {...props} />} />
          <PrivateRoute dispatch={dispatch} path="/authorize/:id" component={Authorize} />
          <PrivateRoute dispatch={dispatch} path="/" name="Home" component={DefaultLayout} />
        </Switch>
      </React.Suspense>
    </HashRouter>
  )
}
