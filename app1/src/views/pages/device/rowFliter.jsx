import React from "react";
import DropdownButtonBinder from "../Components/Dropdownlist";
import { RadioGroup } from "../Components/RadioGroup";
import resources from "./locale";

export default class RowFliter extends React.Component {
  constructor() {
    super();
    this.dataSource = [
      { key: resources.all, value: 0 },
      { key: resources.online, value: 1 },
      { key: resources.offline, value: 2 }
    ];
  }

  componentDidMount() {
    const { agentUserListAction, client } = this.props;
    agentUserListAction(client);
  }

  getData() {
   
    var data = this.props.agentUserList.payload.map(function(item) {
      return {
        key: item.userName,
        value: item.userName
      };
    });
    var userName = this.props.client.userName;
    data.splice(0, 0, { key: userName, value: userName });
    return data;
  }

  render() {
    return (
      <div className="float-right">
        <RadioGroup
          dataSource={this.dataSource}
          name={"deviceStatus"}
          defaultValue = {this.props.defaultValue}
          onChange={(value)=>this.props.deviceStatusFliter(value)}
        />
        <DropdownButtonBinder
          title={resources.user}
          id="agentUserList"
          bsStyle="info"
          dataSource={this.getData()}
          onSelect={(userName)=>this.props.userFilter(userName)}
        />
      </div>
    );
  }
}
