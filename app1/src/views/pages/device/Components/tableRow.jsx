import React from "react";
import resources from "../locale";
import GR from "../../../locale";
import If from "../../../lib/If";
import {Link} from 'react-router-dom';

export default class TableRow extends React.PureComponent {
  getMac(val) {
    if (!val) return "";
    if (val.length < 24) return val;
    return val.substring(0, 24);
  }

  constructor() {
    super();
    this.state = {
      checked: false,
    };
  }

  selected(item, e) {
    this.setState({ checked: e.target.checked });
    this.props.deviceSelected(item.deviceId, e.target.checked);
  }

  sensorOutput(rowData) {
    if (!rowData.sensorNo) return "-";
    if (!this.props.fanModelMap[rowData.sensorNo]) return rowData.sensorNo;
    return `${rowData.sensorNo}/${
      this.props.fanModelMap[rowData.sensorNo].sensorId
    }`;
  }

  render() {
    const { rowData } = this.props;
    console.log('rowdatarguments...', rowData, this.props.fanModelMap)
    return (
      <tr key={rowData.deviceId}>
        <td>{rowData.tenantUserName}</td>
        <td>
          <button
            className="btn-link"
            onClick={() => {
              this.props.updateGroup(rowData.deviceId, rowData.groupName);
            }}
          >
            {rowData.groupName || "-"}
          </button>
        </td>
        <td>
          <button
            className="btn-link"
            onClick={() => {
              this.props.updateName(rowData.deviceId, rowData.name);
            }}
          >
            {rowData.name || "-"}
          </button>
        </td>
        <td>{this.getMac(rowData.mac)}</td>
        <td>{rowData.ip}</td>
        <td style={rowData.value === 1 ? { color: "green" } : { color: "red" }}>
          {rowData.value === 1 ? GR.online : GR.offline}
        </td>
        <td
          style={
            !rowData.licenseExpired ? { color: "green" } : { color: "red" }
          }
        >
          {rowData.licenseExpired ? resources.invalid : resources.valid}
        </td>
        <td>{rowData.licenseRemark}</td>
        <td>
          <button
            className="btn-link"
            onClick={() => {
              this.props.updateSensor(rowData.deviceId);
            }}
          >
            {this.sensorOutput(rowData)}
          </button>
        </td>
        <td>
          <If test={rowData.licenseExpired && !rowData.isVM}>
            <button
              onClick={() => {
                this.props.updateLicense(rowData.deviceId);
              }}
              className="btn btn-success btn-sm"
            >
              {resources.authorize}
            </button>{" "}
          </If>{" "}
         
          <If test={rowData.isVM}>
          <button
            onClick={() => this.props.vmDelete(rowData.deviceId)}
            className="btn btn-default  btn-sm"
          >
            {GR.delete}
          </button></If>
          <Link to={`/device/details/${rowData.deviceId}`}> {resources.more}</Link>
        </td>
      </tr>
    );
  }
}
