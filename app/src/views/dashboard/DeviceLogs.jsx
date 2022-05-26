import React from 'react'
import {
  CAvatar,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilNotes, cilBell, cilBellExclamation, cilAlarm, cilReportSlash } from '@coreui/icons'
import R from './locale'
import { toDate } from 'src/lib/string'

export default ({ data }) => {
  if (!data) return
  const { errorTotal, todayErrorTotal, todayTotal, total, deviceLogs } = data
  const getLogIcon = (val) => {
    if (val === 0) {
      return cilBell
    } else if (val === 1) {
      return cilBellExclamation
    } else {
      return cilReportSlash
    }
  }

  return (
    <CCard className="mb-4">
      <CCardHeader>{R.deviceLogs}</CCardHeader>
      <CCardBody>
        <CRow>
          <CCol xs={12} md={6} xl={6}>
            <CRow>
              <CCol sm={6}>
                <div className="border-start border-start-4 border-start-info py-1 px-3">
                  <div className="text-medium-emphasis small">{R.logCount}</div>
                  <div className="fs-5 fw-semibold">{total}</div>
                </div>
              </CCol>
              <CCol sm={6}>
                <div className="border-start border-start-4 border-start-info py-1 px-3 mb-3">
                  <div className="text-medium-emphasis small">{R.todayCount}</div>
                  <div className="fs-5 fw-semibold">{todayTotal}</div>
                </div>
              </CCol>
            </CRow>

            <hr className="mt-0" />
          </CCol>

          <CCol xs={12} md={6} xl={6}>
            <CRow>
              <CCol sm={6}>
                <div className="border-start border-start-4 border-start-danger py-1 px-3 mb-3">
                  <div className="text-medium-emphasis small">{R.errorCount}</div>
                  <div className="fs-5 fw-semibold">{errorTotal}</div>
                </div>
              </CCol>
              <CCol sm={6}>
                <div className="border-start border-start-4 border-start-danger py-1 px-3 mb-3">
                  <div className="text-medium-emphasis small">{R.todayErrorTotal}</div>
                  <div className="fs-5 fw-semibold">{todayErrorTotal}</div>
                </div>
              </CCol>
            </CRow>

            <hr className="mt-0" />
          </CCol>
        </CRow>

        <br />

        <CTable hover responsive align="middle" className="mb-0 border">
          <CTableHead color="light">
            <CTableRow>
              <CTableHeaderCell className="text-center">
                <CIcon icon={cilNotes} />
              </CTableHeaderCell>
              <CTableHeaderCell>{R.deviceName}</CTableHeaderCell>
              <CTableHeaderCell className="text-center">{R.detail}</CTableHeaderCell>
            </CTableRow>
          </CTableHead>
          <CTableBody>
            {deviceLogs.map((item, index) => {
              return (
                <CTableRow key={index}>
                  <CTableDataCell className="text-center">
                    <CIcon icon={getLogIcon(item.logType)} />
                  </CTableDataCell>
                  <CTableDataCell>
                    <div>{item.deviceName}</div>
                    <div className="small text-medium-emphasis">
                      <span>{item.deviceId}</span> | {toDate(item.createDate)}
                    </div>
                  </CTableDataCell>
                  <CTableDataCell className="text-center">
                    <div className="float-start">
                      <small className="text-medium-emphasis">{item.remark}</small>
                    </div>
                  </CTableDataCell>
                </CTableRow>
              )
            })}
          </CTableBody>
        </CTable>
      </CCardBody>
    </CCard>
  )
}
