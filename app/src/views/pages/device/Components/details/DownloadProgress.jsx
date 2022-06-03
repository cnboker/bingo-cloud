import React, { useEffect } from 'react'
import R from '../../locale'
import { usedownloadProgressEvent } from 'src/views/pages/mqtt/mqttApi'
import { useSelector } from 'react-redux'

export const DownloadProgress = ({ deviceId }) => {
  const downloadEvent = usedownloadProgressEvent()
  const mqttDownloadProgressReducer = useSelector((state) => state.mqttDownloadProgressReducer)
  const data = mqttDownloadProgressReducer[deviceId]
  useEffect(() => {
    downloadEvent()
  }, [])
  if (!data) {
    return <>no data</>
  }
  const { fileName, amountReceived, amountTotal, completed } = data
  return (
    <>
      <div className="row">
        <label className="col-sm-4 col-form-label">{'MAC'}</label>
        <div className="col-sm-8">
          <input type="text" readOnly className="form-control-plaintext" value={deviceId}></input>
        </div>
      </div>
      <div className="row">
        <label className="col-sm-4 col-form-label">{R.downloadProgress}</label>
        <div className="col-sm-8">
          <input type="text" readOnly className="form-control-plaintext" value={fileName}></input>
          <small className="form-text">
            {`${R.amountReceived} : ${amountReceived}`}
            <br />
            {`${R.amountTotal} : ${amountTotal}`}
            <br />
            {`${R.completed} : ${completed ? R.completed : R.unComplete}`}
          </small>
        </div>
      </div>
    </>
  )
}
