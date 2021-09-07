import React from 'react'
import resources from '../locale'
import {tagCatelog} from '../../Tags/contants'
import DropdownButtonBinder from "../../Components/Dropdownlist";

class GroupLink extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      selectGroup: ''
    }
  }

  onTag(e) {
    e.preventDefault();
    this
      .props
      .history
      .push({
        pathname: '/tags/create',
        state: {
          catelog: tagCatelog.deviceGroup
        }
      })
  }

  getData() {
    var data = this
      .props
      .tagReducer[tagCatelog.deviceGroup]
      .split(',')
      .map(val => {
        return {key: val, value: val};
      });

    data.splice(0, 0, {
      value: 'notset',
      key: resources.notset
    });
    data.splice(0, 0, {
      value: '__all',
      key: resources.all
    });
    return data;
  }

  render() {
    return (
      <React.Fragment>

        <DropdownButtonBinder
          id="groupDropdown"
          title={resources.groupFilter}
          bsStyle="success"
          dataSource={this.getData()}
          onSelect={(val) => this.props.groupFilter(val)}/>{' '}
        <button
          className="btn btn-link btn-sm"
          onClick={this
          .onTag
          .bind(this)}>
          {this.props.name || resources.group}
        </button>
      </React.Fragment>

    )

  }
}

export default GroupLink