import React, { useState } from 'react'
import {
  COffcanvas,
  COffcanvasHeader,
  COffcanvasTitle,
  CCloseButton,
  COffcanvasBody,
} from '@coreui/react'

type CProps = {
  placement: 'start' | 'end' | 'top' | 'bottom'
  children: React.ReactChildren
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
