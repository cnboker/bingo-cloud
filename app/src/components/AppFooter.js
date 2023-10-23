import React from 'react'
import { CFooter } from '@coreui/react'

const AppFooter = () => {
  return (
    <CFooter>
      <div>
        <a href="https://dsliz.info" target="_blank" rel="noopener noreferrer">
          IronCloud
        </a>
        <span className="ms-1">&copy; 2021 creativeLabs.</span>
      </div>
      {/* <div className="ms-auto">
        <span className="me-1">Powered by</span>
        <a href="https://dsliz.info" target="_blank" rel="noopener noreferrer">
          dsliz.info
        </a>
      </div> */}
    </CFooter>
  )
}

export default React.memo(AppFooter)
