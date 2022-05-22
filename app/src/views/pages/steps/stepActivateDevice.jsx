import React from 'react'
import { CListGroup, CListGroupItem, CLink } from '@coreui/react'
import R from './locale'
export default () => {
  return (
    <React.Fragment>
      <CListGroup>
        <CListGroupItem>{R.runClient}</CListGroupItem>
        <CListGroupItem>{R.qrScan}</CListGroupItem>
        <CListGroupItem>{R.waitDeviceInfo}</CListGroupItem>
        <CListGroupItem>{R.allowIn}</CListGroupItem>
        <CListGroupItem>
          {R.returnPC}
          <CLink href="/#device">{R.deviceManage}</CLink>
          {R.addLicense}
        </CListGroupItem>
      </CListGroup>
    </React.Fragment>
  )
}
