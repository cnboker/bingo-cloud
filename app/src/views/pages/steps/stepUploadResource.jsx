import React from 'react'
import { CListGroup, CListGroupItem, CLink } from '@coreui/react'
import R from './locale'
export default () => {
  return (
    <React.Fragment>
      <CListGroup>
        <CListGroupItem>{R.materialDefine}</CListGroupItem>
        <CListGroupItem>{R.materialUploadInfo}</CListGroupItem>
        <CListGroupItem>
          {R.click} <CLink href="/#fileManager">{R.materialManage}</CLink>
          {','}
          {R.materialUploadTips}
        </CListGroupItem>
      </CListGroup>
    </React.Fragment>
  )
}
