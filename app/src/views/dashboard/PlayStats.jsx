import React, { useState } from 'react'
import { CButton, CButtonGroup, CCard, CCardBody, CCardFooter, CCol, CRow } from '@coreui/react'
import R from './locale'
import { getStyle, hexToRgba } from '@coreui/utils'
import { CChartLine } from '@coreui/react-chartjs'

export default ({ data }) => {
  const [showState, setShowState] = useState('Day')
  const monthLabels = (data.monthData || []).map((x) => x.key + 'd')
  const monthData = (data.monthData || []).map((x) => +x.value)
  const yearLabels = (data.yearData || []).map((x) => x.key + 'm')
  const yearData = (data.yearData || []).map((x) => +x.value)
  return (
    <CCard className="mb-4">
      <CCardBody>
        <CRow>
          <CCol sm={5}>
            <h4 id="traffic" className="card-title mb-0">
              {R.playStats}
            </h4>
            <div className="small text-medium-emphasis">
              {showState === 'Day' ? data.monthTitle : data.yearTitle}
            </div>
          </CCol>
          <CCol sm={7} className="d-none d-md-block">
            <CButtonGroup className="float-end me-3">
              {['Day', 'Month'].map((value) => (
                <CButton
                  color="outline-secondary"
                  key={value}
                  className="mx-0"
                  onClick={() => {
                    showState === 'Day' ? setShowState('Month') : setShowState('Day')
                  }}
                  active={value === showState}
                >
                  {value}
                </CButton>
              ))}
            </CButtonGroup>
          </CCol>
        </CRow>
        <CChartLine
          style={{ height: '300px', marginTop: '40px' }}
          data={{
            labels: showState === 'Day' ? monthLabels : yearLabels,
            datasets: [
              {
                label: R.playLabel,
                backgroundColor: hexToRgba(getStyle('--cui-info'), 10),
                borderColor: getStyle('--cui-info'),
                pointHoverBackgroundColor: getStyle('--cui-info'),
                borderWidth: 2,
                data: showState === 'Day' ? monthData : yearData,
                fill: true,
              },
            ],
          }}
          options={{
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: false,
              },
            },
            scales: {
              x: {
                grid: {
                  drawOnChartArea: false,
                },
              },
              y: {
                ticks: {
                  beginAtZero: true,
                  maxTicksLimit: 5,
                  stepSize: Math.ceil(250 / 5),
                  max: 250,
                },
              },
            },
            elements: {
              line: {
                tension: 0.4,
              },
              point: {
                radius: 0,
                hitRadius: 10,
                hoverRadius: 4,
                hoverBorderWidth: 3,
              },
            },
          }}
        />
      </CCardBody>
      <CCardFooter></CCardFooter>
    </CCard>
  )
}
