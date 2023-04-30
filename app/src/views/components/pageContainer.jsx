import React from 'react'
import { CContainer } from '@coreui/react'

export default ({ children }) => {
  return (
    <CContainer fluid className="page p-3 border">
      {children}
    </CContainer>
  )
}
