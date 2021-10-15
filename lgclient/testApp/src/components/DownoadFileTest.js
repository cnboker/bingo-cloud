import React, {useState, useEffect} from 'react'
import {downloadManager} from "lgservice";

export default() => {
  const [ticket,
    setTicket] = useState()
  const [amountReceived,
    setAmountReceived] = useState(0)
  const [amountTotal,
    setAmountTotal] = useState(0)
  const {download} = downloadManager

  const downloadTest = () => {
    function cb(res) {
      const {ticket, amountReceived, amountTotal} = res
      setAmountReceived(amountReceived)
      setAmountTotal(amountTotal)
      setTicket(ticket)
    }
    const token = '';
    download(`http://42.192.11.12:8080/videos/hike.mp4`, token, (res)=>{
      cb(res)
    }).then(res => {
      cb(res)
    }).catch(e => {
      console.log('error->', e)
    })
  }

  return (
    <React.Fragment> 
      <button onClick={() => downloadTest()}>downalodTest</button>
      <div>
        download percent:{amountTotal > 0
          ? amountReceived / amountTotal * 100
          : 0}
      </div>
      <div>amountTotal:{amountTotal}</div>
      <div>amountReceived:{amountReceived}</div>
      <div>ticket:{ticket}</div>
    </React.Fragment>
  )
}