import React, { useState } from 'react'
import { CRow, CCol } from '@coreui/react'
import R from './locale'
import { LineChart, BarChart, ChartColor } from './SimpleChart'
import { CWidgetStatsB } from '@coreui/react'
const WidgetsDropdown = ({ data }) => {
  const { offlineCount, onlineCount, licenseCount, availiableLicenceCount, deviceDataByM, licenseDataByM } = data
  console.log('data', data)
  const rate = onlineCount + offlineCount > 0 ? (onlineCount / (onlineCount + offlineCount)).toFixed(0) : 0
  const chartH1 = (
    <>
      {`${onlineCount} / ${onlineCount + offlineCount}`} <span className="fs-6 fw-normal">({rate}%)</span>
    </>
  )
  const barH1 = (
    <>
      5000M
      <span className="fs-6 fw-normal">(80%)</span>
    </>
  )

  return (
    <CRow>
      <CCol sm={6} lg={3}>
        <LineChart colorClassName={'primary'} h1={offlineCount + onlineCount} title={R.deviceQty} datasetLabel={R.qty} data={deviceDataByM.map((x) => +x.value)} color={ChartColor.blue} />
      </CCol>
      <CCol sm={6} lg={3}>
        <CWidgetStatsB style={{ height: '163px' }} className="mb-4" progress={{ color: 'success', value: rate * 100 }} text={`${onlineCount} is Online `} title={R.deviceState} value={`${rate}%`} />
      </CCol>
      <CCol sm={6} lg={3}>
        <LineChart
          colorClassName={'warning'}
          h1={`${availiableLicenceCount} / ${licenseCount}`}
          title={`${availiableLicenceCount} ${R.deviceLicense}`}
          datasetLabel={R.deviceLicense}
          data={licenseDataByM.map((x) => +x.value)}
          color={ChartColor.lightBlue}
        />
      </CCol>
      <CCol sm={6} lg={3}>
        <BarChart h1={barH1} title={R.diskStats} datasetLabel={R.diskStats} data={[78, 81, 80, 45, 34, 12, 40, 85, 65, 23, 12, 98, 34, 84, 67, 82]} color={ChartColor.red} />
      </CCol>
    </CRow>
  )
}

export default WidgetsDropdown
