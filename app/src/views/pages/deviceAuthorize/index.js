/* eslint-disable no-use-before-define */
import React, { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { tokenPost, authorizeRequest, unAuthorizeListRequest } from './actions'
import * as Dialog from 'src/views/components/dialog/Index'
import G from 'src/locale'
import { useParams } from 'react-roouter-dom'
import { CCard, CCardHeader, CCardBody, CRow, CCol, CButton, CAlert } from '@coreui/react'

export default () => {
  const dispatch = useDispatch()
  const { id: authorizeCode } = useParams()
  const unAuthorizeReducer = useSelector((state) => state.unAuthorizeReducer)
  const waittingMessage = '正在请求认证信息...'

  useEffect(() => {
    dispatch(unAuthorizeListRequest())
    if (authorizeCode.length > 1) {
      dispatch(tokenPost(authorizeCode))
    }
  }, [])

  const authorizeHandle = (id) => {
    Dialog.confirm(G.confirmInfo, () => {
      dispatch(authorizeRequest({ id }))
    })
  }

  return (
    <CCard>
      <CCardHeader component="h5">Device Authorize</CCardHeader>
      <CCardBody>
        {unAuthorizeReducer.map((item, index) => {
          return <DeviceComoponent data={item} key={index} authorizeHandle={authorizeHandle} />
        })}
        {unAuthorizeReducer.length === 0 && <CAlert>{waittingMessage}</CAlert>}
      </CCardBody>
    </CCard>
  )
}

const DeviceComoponent = ({ data, urlAuthorCode, authorizeHandle }) => {
  const { name, os, resolution, authorizeStatus, authorizeCode, deviceId } = data
  return (
    <>
      <CRow xs={{ cols: 'auto' }}>
        <CCol>{name}</CCol>
      </CRow>
      <CRow xs={{ cols: 'auto' }}>
        <CCol>OS:{os}</CCol>
        <CCol>
          {G.resolution}:{resolution}
        </CCol>
      </CRow>
      <CRow xs={{ cols: 'auto' }}>
        <CCol>
          {authorizeCode === urlAuthorCode && authorizeStatus === 0 && (
            <CButton color="primary" onClick={() => authorizeHandle(deviceId)}>
              {G.authorize}
            </CButton>
          )}
        </CCol>
      </CRow>
    </>
  )
}
