import React from 'react'
import logo from 'src/assets/images/logo.png'
import { CImage } from '@coreui/react'

export default () => {
  return (

    <a href="http://www.dsliz.info">

      <CImage src={logo} width={200} align="center" />
    </a>
  )
}
