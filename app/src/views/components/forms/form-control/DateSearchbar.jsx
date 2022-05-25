import React, { useState, useEffect } from 'react'
import { CInputGroup, CInputGroupText, CFormInput, CButton, CRow, CCol } from '@coreui/react'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import moment from 'moment'
import G from '~/locale'
export default ({ onSearch }) => {
  const [startDate, setStartDate] = useState(moment().subtract(30, 'days').toDate())
  const [endDate, setEndDate] = useState(moment().toDate())
  const [keyword, setKeyword] = useState('')
  useEffect(() => {
    onSearch({
      startDate,
      endDate,
      keyword,
      page: 0,
    })
  }, [])
  return (
    <>
      <CRow className="mb-3">
        <CCol>
          <DatePicker
            className="form-control"
            selected={startDate}
            onChange={(date) => {
              setStartDate(date)
            }}
          />
        </CCol>
        <CCol>
          <DatePicker
            className="form-control"
            selected={endDate}
            onChange={(date) => {
              setEndDate(date)
            }}
          />
        </CCol>
        <CCol>
          <CInputGroup>
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
              {G.search}
            </CButton>
          </CInputGroup>
        </CCol>
      </CRow>
    </>
  )
}
