import React from 'react'
import { CRow, CFormLabel, CCol, CCard, CCardBody } from '@coreui/react'
import { useSelector } from 'react-redux'
import QRCode from 'qrcode.react'
import TextRow from 'src/views/components/forms/TextRow'
import G from 'src/locale'
export default () => {
  const { order } = useSelector((state) => state.orderContextReducer)
  return (
    <CCard>
      <CCardBody>
        <TextRow label={G.orderNo} text={order.orderNo} />
        <TextRow label={G.payMethod} text={G.weixinPay} />
        <TextRow label={G.promotion_code} text={order.benifitCode ? order.benifitCode : G.none} />
        <TextRow label={G.subtotal} text={order.subTotal.toFixed(2)} />
        <TextRow label={G.amount} text={order.amount.toFixed(2)} />
        <TextRow label={G.device_count} text={order.licenseCount} />
        <TextRow label={G.availableDays} text={order.validDays} />
        <CRow className="mb-3">
          <CFormLabel className="col-sm-2 col-form-label">{G.qrPay}</CFormLabel>
          <CCol sm={10}>
            <QRCode
              value={`${process.env.REACT_APP_SERVICE_URL}/tenpayV3/?orderno=${order.orderNo}`}
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
