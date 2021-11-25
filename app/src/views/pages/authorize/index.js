/* eslint-disable no-use-before-define */
import React, { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { tokenPost, authorizeRequest, unAuthorizeListRequest } from './actions'
import * as Dialog from 'src/views/components/dialog/Index'
import G from '~/locale'
import { useParams } from 'react-router-dom'
import { CCard, CCardHeader, CCardBody, CRow, CCol, CButton, CAlert } from '@coreui/react'

export default () => {
  const dispatch = useDispatch()
  const { id: urlAuthorizeCode } = useParams()
  const authorizeReducer = useSelector((state) => state.authorizeReducer)
  const waittingMessage = '正在请求认证信息...'
  //console.log('authorizeCode', urlAuthorizeCode)
  useEffect(() => {
    dispatch(unAuthorizeListRequest())
    if (urlAuthorizeCode.length > 1) {
      dispatch(tokenPost(urlAuthorizeCode))
    }
  }, [])

  const authorizeHandle = (id) => {
    Dialog.confirm(G.confirmInfo, () => {
      dispatch(authorizeRequest(id))
    })
  }

  return (
    <CCard>
      <CCardHeader component="h5">Device Authorize</CCardHeader>
      <CCardBody>
        {authorizeReducer.map((item, index) => {
          return (
            <DeviceComoponent
              data={item}
              key={index}
              authorizeHandle={authorizeHandle}
              urlAuthorizeCode={urlAuthorizeCode}
            />
          )
        })}
        {authorizeReducer.length === 0 && <CAlert color="secondary">{waittingMessage}</CAlert>}
      </CCardBody>
    </CCard>
  )
}

const DeviceComoponent = ({ data, urlAuthorizeCode, authorizeHandle }) => {
  const { name, os, authorizeStatus, authorizeCode, deviceId } = data
  return (
    <React.Fragment>
      <CRow xs={{ cols: 'auto' }}>
        <CCol>{name}</CCol>
      </CRow>
      <CRow xs={{ cols: 'auto' }}>
        <CCol>OS:{os}</CCol>
      </CRow>
      <CRow xs={{ cols: 'auto' }}>
        <CCol>
          {authorizeCode === urlAuthorizeCode && authorizeStatus === 0 && (
            <CButton color="primary" onClick={() => authorizeHandle(deviceId)}>
              {G.authorize}
            </CButton>
          )}
        </CCol>
      </CRow>
    </React.Fragment>
  )
}
