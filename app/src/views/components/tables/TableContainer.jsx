import React from 'react'
import { CCard, CCardBody, CCardHeader } from '@coreui/react'

export default ({ title, children }) => {
  return (
    <CCard>
      <CCardHeader component="h5">{title}</CCardHeader>
      <CCardBody>{children}</CCardBody>
    </CCard>
  )
}
