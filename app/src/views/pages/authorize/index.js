/* eslint-disable no-use-before-define */
import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { tokenPost, authorizeRequest, unAuthorizeListRequest } from './actions'
import * as Dialog from 'src/views/components/dialog/Index'
import { useParams } from 'react-router-dom'
import { useInterval } from 'src/lib/useInterval'
import { CCard, CCardHeader, CCardBody, CRow, CCol, CButton } from '@coreui/react'
import R from './locale'
import G from '~/locale'

export default () => {
  const dispatch = useDispatch()
  const { id: urlAuthorizeCode } = useParams()

  const authorizeReducer = useSelector((state) => state.authorizeReducer)
  const [message, setMessage] = useState(R.authorizeRequest)
  useInterval(() => {
    dispatch(unAuthorizeListRequest())
  }, 2000)

  useEffect(() => {
    if (urlAuthorizeCode.length > 1) {
      //上传token到服务器
      dispatch(tokenPost(urlAuthorizeCode))
    }
  }, [])

  useEffect(() => {
    setMessage('')
    if (authorizeReducer.length === 0) {
      setMessage(R.nodevice)
    }
    const current = authorizeReducer.find((x) => x.authorizeCode === urlAuthorizeCode)
    if (current && current.authorizeStatus === 1) {
      setMessage(R.authenticationSuccessMessage)
    }
  }, [authorizeReducer])

  const authorizeHandle = (id) => {
    Dialog.confirm(G.confirmInfo, () => {
      dispatch(authorizeRequest(id))
    })
  }

  return (
    <CCard>
      <CCardHeader component="h5">{R.deviceAuthentication}</CCardHeader>
      <CCardBody>
        {authorizeReducer.map((item, index) => {
          return <DeviceComoponent data={item} key={index} authorizeHandle={authorizeHandle} urlAuthorizeCode={urlAuthorizeCode} />
        })}
        <div>{message}</div>
      </CCardBody>
    </CCard>
  )
}

const DeviceComoponent = ({ data, urlAuthorizeCode, authorizeHandle }) => {
  const { name, os, authorizeStatus, authorizeCode, deviceId } = data
  return (
    <>
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
              {G.activateDevice}
            </CButton>
          )}
        </CCol>
      </CRow>
    </>
  )
}
