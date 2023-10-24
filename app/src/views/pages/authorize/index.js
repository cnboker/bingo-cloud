/* eslint-disable no-use-before-define */
import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { tokenPost, authorizeRequest, unAuthorizeListRequest } from './actions'
import { useParams } from 'react-router-dom'
import { useInterval } from 'src/lib/useInterval'
import { CCard, CCardHeader, CCardBody } from '@coreui/react'
import R from './locale'

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
    var item = authorizeReducer.find(x => x.authorizeCode === urlAuthorizeCode && x.authorizeStatus === 0)
    if (item) {
      if (item.authorizeStatus == 0) {
        dispatch(authorizeRequest(item.deviceId))
      } else {
        setMessage(R.authenticationSuccessMessage)
      }
    }
  }, [authorizeReducer])

  return (
    <CCard>
      <CCardHeader component="h5">{R.deviceAuthentication}</CCardHeader>
      <CCardBody>
        <div>{message}</div>
      </CCardBody>
    </CCard>
  )
}

