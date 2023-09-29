import React, { useState, useRef } from 'react'
import ReactDOM from 'react-dom'
import { CButton, CModal, CModalHeader, CModalFooter, CModalTitle, CModalBody, CToast, CToastBody, CToastClose, CToaster, CRow, CCol, CFormInput } from '@coreui/react'
import G from 'src/locale'
//bodydata: 收集dialog‘body的数据，比如form数据
const Dialog = ({ title, body, bodydata, size = 'lg', callback, fullscreen }) => {
  const [visible, setVisible] = useState(true)

  return (
    <>
      <CModal visible={visible} alignment="center" size={size} fullscreen={fullscreen}>
        <CModalHeader>
          <CModalTitle>{title}</CModalTitle>
        </CModalHeader>
        <CModalBody>{body}</CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setVisible(false)}>
            Close
          </CButton>
          {callback && (
            <CButton
              color="primary"
              onClick={() => {
                if (callback) {
                  callback(bodydata)
                }
                setVisible(false)
              }}
            >
              Ok
            </CButton>
          )}
        </CModalFooter>
      </CModal>
    </>
  )
}

// 每一次重新构造组件
const WithDialog = ({ children, ...props }) => {
  //const ref = useRef()
  const Component = () => React.createElement(Dialog, { ...props }, children)
  return <Component>{children}</Component>
}

export const show = (options, callback) => {
  const jsx = <WithDialog {...options} callback={callback} />
  // eslint-disable-next-line @typescript-eslint/no-use-before-define
  ReactDOM.render(jsx, createContainer())
}

export const confirm = (body, cb) => {
  show({ title: G.info, body, fullscreen: true }, cb)
}

export const prompt = (title, cb) => {
  const bodydata = {}
  show(
    {
      title,
      bodydata,
      body: (
        <CRow>
          <CCol xs>
            <CFormInput placeholder={title} aria-label={title} onChange={(e) => (bodydata.val = e.target.value)} />
          </CCol>
        </CRow>
      ),
    },
    cb,
  )
}

export const toast = (message, color = 'warning') => {
  const Toaster = () => {
    const toastJSX = (
      <CToast autohide={true} className="align-items-center" animation={true} color={color}>
        <div className="d-flex">
          <CToastBody>{message}</CToastBody>
          <CToastClose className="me-2 m-auto" />
        </div>
      </CToast>
    )
    return <CToaster push={toastJSX} placement="bottom-end" />
  }
  // eslint-disable-next-line @typescript-eslint/no-use-before-define
  ReactDOM.render(<Toaster message={message} />, createContainer())
}

const createContainer = () => {
  var container = document.getElementById('dialogContainer')
  if (!container) {
    container = document.createElement('div')
    container.id = 'dialogContainer'
    document.body.appendChild(container)
  }
  return container
}
