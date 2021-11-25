import React, { useState } from 'react'
import { CCard, CCardBody, CCardText, CButton, CCardTitle } from '@coreui/react'
import Offcanvas from '~/views/components/dialog/Offcanvas'
import Trial from '../orderHandlers/Trial'
import { useSelector } from 'react-redux'
import G from '~/locale'
export default () => {
  const [visible, setVisible] = useState(false)
  const context = useSelector((state) => state.orderContextReducer)

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
        <CCardTitle>欢迎使用粒子数字标牌云发布系统</CCardTitle>
        <CCardText>
          {context.isCreateTrial && (
            <React.Fragment>
              新注册用户,可以免费试用1个月,允许5台设备激活,试用期后不续费不影响设备播放，只影响新内容发布，
              <CButton onClick={() => setVisible(true)}>开始试用</CButton> <br />
            </React.Fragment>
          )}
          老用户如果需要续费，点击<CButton href="#orderHandlers/create">续费</CButton> <br />
        </CCardText>
      </CCardBody>
    </CCard>
  )
}
