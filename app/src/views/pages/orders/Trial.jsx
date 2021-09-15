import React, { useEffect } from 'react'
import { useHistory } from 'react-router'
import { useSelector, useDispatch } from 'react-redux'
import { CForm, CFormLabel, CButton, CCard, CCardBody, CAlert } from '@coreui/react'
import { createTrial } from './actions'

export default () => {
  const history = useHistory()
  const dispatch = useDispatch()
  const orderContextReducer = useSelector((state) => state.orderContextReducer)

  useEffect(() => {
    if (!orderContextReducer.isTrail) {
      history.push('/order/create')
    }
  }, [])

  return (
    <CCard>
      <CCardBody>
        <CForm>
          <div className="mb-3">
            <CAlert color="info">
              试用会员最多可以激活{orderContextReducer.trialDeviceCount}台设备使用
            </CAlert>

            <CFormLabel>试用设备:{orderContextReducer.trialDeviceCount}</CFormLabel>
          </div>
          <div className="mb-3">
            <CButton
              type="submit"
              color="primary"
              onClick={() => {
                dispatch(createTrial())
              }}
            >
              创建
            </CButton>
          </div>
        </CForm>
      </CCardBody>
    </CCard>
  )
}
