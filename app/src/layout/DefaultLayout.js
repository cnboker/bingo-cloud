import React from 'react'
import { AppContent, AppSidebar, AppFooter, AppHeader } from '../components/index'
import Start from '../views/start'

const DefaultLayout = () => {
  return (
    <div>
      <Start />
      <AppSidebar />
      <div className="wrapper d-flex flex-column min-vh-100 bg-light">
        <AppHeader />
        <div className="body flex-grow-1 px-3">
          <AppContent />
        </div>
        <AppFooter />
      </div>
    </div>
  )
}

export default DefaultLayout
