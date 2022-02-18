import React from 'react'
import { CContainer } from '@coreui/react'

export default ({ children }) => {
  return (
    <CContainer xxl className="page p-3 border">
      {children}
    </CContainer>
  )
}
