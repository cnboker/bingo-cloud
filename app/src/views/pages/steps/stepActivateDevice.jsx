import React from 'react'
import { CListGroup, CListGroupItem, CButton } from '@coreui/react'
export default () => {
  return (
    <React.Fragment>
      <CListGroup>
        <CListGroupItem>1. 启动数字标牌终端</CListGroupItem>
        <CListGroupItem>
          2. 等待二维码页面出现,通过手机扫描二维码(首次使用需要先登录系统)
        </CListGroupItem>
        <CListGroupItem>3. 系统导航到设备授权页面，等待当前设备信息显示</CListGroupItem>
        <CListGroupItem>4. 点击“允许接入”</CListGroupItem>
        <CListGroupItem>
          5.前往PC端，点击
          <CButton href="#device">设备管理</CButton>
          为设备添加许可
        </CListGroupItem>
      </CListGroup>
    </React.Fragment>
  )
}
