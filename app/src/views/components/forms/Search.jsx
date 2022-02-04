import React from 'react'
import { CForm, CFormInput } from '@coreui/react'
export default ({ onSearch }) => {
  return (
    <CForm>
      <CFormInput
        placeholder="keyword"
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            onSearch(e.target.value)
          }
        }}
      />
    </CForm>
  )
}
