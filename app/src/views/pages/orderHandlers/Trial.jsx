import React from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { CButton, CCard, CCardBody, CAlert } from '@coreui/react'
import { createTrial } from './actions'
import TextRow from 'src/views/components/forms/TextRow'

export default ({ onCreate }) => {
  const dispatch = useDispatch()
  const orderContextReducer = useSelector((state) => state.orderContextReducer)

  return (
    <CCard>
      <CCardBody>
        <CAlert color="info">欢迎试用,您的支持是对我们最大的信任</CAlert>
        <TextRow size="sm" label="试用期" text={orderContextReducer.trialDays} />
        <TextRow size="sm" label="最大试用设备" text={orderContextReducer.trialDeviceCount} />

        <CButton
          type="button"
          color="primary"
          onClick={() => {
            dispatch(createTrial())
            if (onCreate) {
              onCreate()
            }
          }}
        >
          确认
        </CButton>
      </CCardBody>
    </CCard>
  )
}
