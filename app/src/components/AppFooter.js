import React from 'react'
import { CFooter } from '@coreui/react'

const AppFooter = () => {
  return (
    <CFooter>
      <div>
        <a href="https://www.dsliz.info" target="_blank" rel="noopener noreferrer">
          Bingo
        </a>
        <span className="ms-1">&copy; 2023 creative.</span>
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
