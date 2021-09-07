import React from 'react'
import TableContainer from '../../Components/Tables/TableContainer'
import TagCreate from '../../Tags/create'
import resources from '../locale'
import {Link} from 'react-router-dom';

export default class GroupCreate extends React.Component {
  

  render() {
    return (
      <TableContainer title={resources.group}>
      <div className="mb-4">
            <Link to={`/device`} className="btn btn-default">
              返回
            </Link>{" "}
          </div>
        <TagCreate {...this.props}/>
      </TableContainer>
    )
  }

}