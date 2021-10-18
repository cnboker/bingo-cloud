import React from 'react'
import DownoadFileTest from './components/DownoadFileTest'
import QueryDeviceInfoTest from './components/QueryDeviceInfoTest'
import IOTest from './components/ioTest'
export default() => {
  return (
    <React.Fragment>
      <DownoadFileTest/>
      <hr/>
      {/* <QueryDeviceInfoTest/>
      <hr/> */}
      <IOTest />
    </React.Fragment>

  )
}