import React from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { CButton, CCard, CCardBody, CAlert } from '@coreui/react'
import { createTrial } from './actions'
import TextRow from 'src/views/components/forms/TextRow'
import R from './locale'
import G from '~/locale'

export default ({ onCreate }) => {
  const dispatch = useDispatch()
  const orderContextReducer = useSelector((state) => state.orderContextReducer)

  return (
    <CCard>
      <CCardBody>
        <TextRow size="sm" label={R.trial_days} text={orderContextReducer.trialDays} />
        <TextRow size="sm" label={R.trial_max_device} text={orderContextReducer.trialDeviceCount} />
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
          {G.confirm}
        </CButton>
      </CCardBody>
    </CCard>
  )
}
