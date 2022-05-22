import React, { useState } from 'react'
import { CCard, CCardBody, CCardText, CLink } from '@coreui/react'
import Offcanvas from '~/views/components/dialog/Offcanvas'
import Trial from '../orderActions/Trial'
import { useSelector } from 'react-redux'
import G from '~/locale'
import R from './locale'

export default () => {
  const [visible, setVisible] = useState(false)
  const orderContext = useSelector((state) => state.orderContextReducer)

  return (
    <CCard>
      <CCardBody>
        {visible && (
          <Offcanvas
            title={G.info}
            visible={visible}
            placement="start"
            onHide={() => setVisible(false)}
          >
            <Trial
              onCreate={() => {
                setVisible(false)
              }}
            />
          </Offcanvas>
        )}
        <CCardText>
          {orderContext.isCreateTrial && (
            <React.Fragment>
              {R.newUserMessage.format(orderContext.trialDeviceCount)},
              <CLink onClick={() => setVisible(true)}>{R.activate}</CLink> {R.rightNow}.
            </React.Fragment>
          )}
          {'  '}
          {R.renewMessage} {R.click.toLowerCase()}
          {'  '}
          <CLink href="/#orderActions/create">{R.renew}</CLink>.
        </CCardText>
      </CCardBody>
    </CCard>
  )
}
