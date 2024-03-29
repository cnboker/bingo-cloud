import React from 'react'
import {
  COffcanvas,
  COffcanvasHeader,
  COffcanvasTitle,
  CCloseButton,
  COffcanvasBody,
} from '@coreui/react'

type CProps = {
  placement: 'start' | 'end' | 'top' | 'bottom'
  children: React.ReactNode
  visible: boolean
  title: string
  onHide: () => void
}

export default ({ title, children, placement, visible, onHide }: CProps) => {
  return (
    <>
      <COffcanvas
        placement={placement}
        visible={visible}
        className="offcanvas-size-md"
        onHide={() => {
          onHide()
        }}
      >
        <COffcanvasHeader>
          <COffcanvasTitle>{title}</COffcanvasTitle>
          <CCloseButton
            className="text-reset"
            onClick={() => {
              onHide()
            }}
          />
        </COffcanvasHeader>
        <COffcanvasBody>{children}</COffcanvasBody>
      </COffcanvas>
    </>
  )
}
