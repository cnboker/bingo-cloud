import React from 'react'
import { CRow, CFormLabel, CCol, CFormInput, CCard, CCardBody } from '@coreui/react'
import { useSelector } from 'react-redux'
import QRCode from 'qrcode.react'

export default () => {
  const { order } = useSelector((state) => state.orderContextReducer)
  return (
    <CCard>
      <CCardBody>
        <TextRow label="订单编号" text={order.orderNo} />
        <TextRow label="付款方式" text={'微信支付'} />
        <TextRow label="优惠券" text={order.benifitCode ? order.benifitCode : '无'} />
        <TextRow label="费用合计" text={order.subTotal} />
        <TextRow label="实付金额" text={order.amount} />
        <TextRow label="设备数量" text={order.licenseCount} />
        <TextRow label="可用天数" text={order.validDays} />
        <CRow className="mb-3">
          <CFormLabel className="col-sm-2 col-form-label">扫描二维码付款</CFormLabel>
          <CCol sm={10}>
            <QRCode
              value={`http://www.ioliz.com/tenpayV3/?orderno=${order.orderNo}`}
              size={290}
              level={'H'}
              includeMargin={true}
            />
          </CCol>
        </CRow>
      </CCardBody>
    </CCard>
  )
}

const TextRow = ({ label, text }) => {
  return (
    <CRow className="mb-3">
      <CFormLabel className="col-sm-2 col-form-label">{label}</CFormLabel>
      <CCol sm={10}>
        <CFormInput type="text" defaultValue={text} readOnly plainText />
      </CCol>
    </CRow>
  )
}
