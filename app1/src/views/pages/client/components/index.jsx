import React from 'react'
import { BrowserRouter as Router } from 'react-router-dom'
import Settings from './settings'
import resources from '../locale'
import TableContainer from '~/views/Components/Tables/TableContainer'

export default (props) => {
  return (
    <Router>
      <TableContainer>
        <Settings />
      </TableContainer>
    </Router>
  )
}
