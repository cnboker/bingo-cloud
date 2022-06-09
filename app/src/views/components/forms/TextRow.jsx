import { CRow, CFormLabel, CFormInput, CCol } from '@coreui/react'

export default ({ label, text, size = 'lg' }) => {
  if (size === 'sm') {
    return (
      <CRow className="mb-3">
        <CFormLabel className="col-sm-5 col-form-label">{label}</CFormLabel>
        <CCol sm={5}>
          <CFormInput type="text" defaultValue={text} readOnly plainText />
        </CCol>
      </CRow>
    )
  }
  return (
    <CRow className="mb-3">
      <CFormLabel className="col-sm-2 col-form-label">{label}</CFormLabel>
      <CCol sm={10}>
        <CFormInput type="text" defaultValue={text} readOnly plainText />
      </CCol>
    </CRow>
  )
}
