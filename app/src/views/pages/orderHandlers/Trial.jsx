import React, { useEffect } from 'react'
import { useHistory } from 'react-router'
import { useSelector, useDispatch } from 'react-redux'
import { CForm, CButton, CCard, CCardBody, CAlert } from '@coreui/react'
import { createTrial } from './actions'
import TextRow from 'src/views/components/forms/TextRow'

export default () => {
  const history = useHistory()
  const dispatch = useDispatch()
  const orderContextReducer = useSelector((state) => state.orderContextReducer)

  useEffect(() => {
    if (!orderContextReducer.isCreateTrial) {
      history.push('/orderHandlers/create')
    }
  }, [])

  return (
    <CCard>
      <CCardBody>
        <CForm>
          <CAlert color="info">欢迎试用,您的支持是对我们最大的信任</CAlert>
          <TextRow size="sm" label="试用期" text={orderContextReducer.trialDays} />
          <TextRow size="sm" label="最大试用设备" text={orderContextReducer.trialDeviceCount} />

          <CButton
            type="submit"
            color="primary"
            onClick={() => {
              dispatch(createTrial())
            }}
          >
            确认
          </CButton>
        </CForm>
      </CCardBody>
    </CCard>
  )
}
