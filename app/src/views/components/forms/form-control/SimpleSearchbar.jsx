import { CInputGroup, CInputGroupText, CFormInput } from '@coreui/react'
export default ({ onSearch }) => {
  return (
    <CInputGroup className="mb-3">
      <CInputGroupText id="basic-addon1">@</CInputGroupText>
      <CFormInput
        placeholder="Keyword"
        aria-label="Keyword"
        aria-describedby="basic-addon1"
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            onSearch(e.target.value)
          }
        }}
      />
    </CInputGroup>
  )
}
