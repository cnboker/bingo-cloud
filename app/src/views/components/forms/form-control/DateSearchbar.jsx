import React, { useState } from 'react'
import { CInputGroup, CInputGroupText, CFormInput, CButton } from '@coreui/react'
import DatePicker from 'react-datepicker'
import moment from 'moment'
export default ({ onSearch }) => {
  const [startDate, setStartDate] = useState(moment().subtract(30, 'days').toDate())
  const [endDate, setEndDate] = useState(moment().toDate())
  const [keyword, setKeyword] = useState('')
  return (
    <CInputGroup className="mb-3">
      <DatePicker
        className="form-control"
        selected={startDate}
        onChange={(date) => {
          setStartDate(date)
        }}
      />
      <DatePicker
        className="form-control"
        selected={endDate}
        onChange={(date) => {
          setEndDate(date)
        }}
      />
      <CInputGroupText id="basic-addon1">@</CInputGroupText>
      <CFormInput
        placeholder="Keyword"
        aria-label="Keyword"
        aria-describedby="basic-addon1"
        onChange={(e) => {
          setKeyword(e.target.value)
        }}
      />
      <CButton
        color="light"
        onClick={() => {
          onSearch({
            startDate,
            endDate,
            keyword,
            page: 0,
          })
        }}
      >
        搜索
      </CButton>
    </CInputGroup>
  )
}
