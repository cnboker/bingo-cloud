import React, { Component } from "react";
import TableRow from "./tableRow";
import resources from "../locale";

export default class DeviceMoniter extends Component {
  render() {
    return (
      <table className="table table-bordered table-striped table-sm">
        <thead>
          <tr>
            <th>{resources.tenant}</th>
            <th>{resources.group}</th>
            <th>{resources.device_name}</th>
            <th>MAC</th>
            <th>IP</th>
            <th>{resources.device_status}</th>
            <th>{resources.license_info}</th>
            <th>{resources.remark}</th>
            <th>{resources.setSensor}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>{this.renderList()}</tbody>
      </table>
    );
  }

  renderList() {
    const { sensorConfig } = this.props;

    const fanModelMap = sensorConfig.fanModel.reduce((map, val) => {
      map[val.name] = val;
      return map;
    }, {});

    return this.props.tableData.map((item, key) => {
      return (
        <TableRow
          key={key}
          rowData={item}
          fanModelMap={fanModelMap}
          updateLicense={this.props.updateLicense}
          updateName={this.props.updateName}
          updateSensor={this.props.updateSensor}
          detailView={this.props.detailView}
          deviceSelected={this.props.deviceSelected}
          updateGroup={this.props.updateGroup}
          vmDelete ={this.props.vmDelete}
        />
      );
    });
  }
}
