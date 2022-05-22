import React from 'react'
import { CListGroup, CListGroupItem, CLink } from '@coreui/react'
import R from './locale'
export default () => {
  return (
    <React.Fragment>
      <CListGroup>
        <CListGroupItem>{R.customPage1}</CListGroupItem>
        <CListGroupItem>{R.customPage2}</CListGroupItem>
      </CListGroup>
    </React.Fragment>
  )
}
