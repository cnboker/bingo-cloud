import React, { useState, useRef } from 'react'
import ReactDOM from 'react-dom'
import {
  CButton,
  CModal,
  CModalHeader,
  CModalFooter,
  CModalTitle,
  CModalBody,
  CToast,
  CToastBody,
  CToastClose,
  CToaster,
} from '@coreui/react'

const Dialog = ({ title, body, callback }) => {
  const [visible, setVisible] = useState(true)

  return (
    <>
      <CModal visible={visible} alignment="center" size={'lg'}>
        <CModalHeader onDismiss={() => setVisible(false)}>
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
                  callback()
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
  const ref = useRef()
  const Component = () => React.createElement(Dialog, { ref, ...props }, children)
  return <Component>{children}</Component>
}

export const confirm = (body, callback) => {
  const jsx = <WithDialog title={'Information'} body={body} callback={callback} />
  // eslint-disable-next-line @typescript-eslint/no-use-before-define
  ReactDOM.render(jsx, createContainer())
}

export const toast = (message) => {
  const Toaster = () => {
    const toastJSX = (
      <CToast autohide={true} className="align-items-center">
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
