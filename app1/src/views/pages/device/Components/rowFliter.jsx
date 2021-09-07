import React from "react";
import DropdownButtonBinder from "../../Components/Dropdownlist";
import { RadioGroup } from "../../Components/RadioGroup";
import resources from "../locale";

export default class RowFliter extends React.Component {
  constructor() {
    super();
    this.dataSource = [
      {
        key: resources.all,
        value: 0,
      },
      {
        key: resources.online,
        value: 1,
      },
      {
        key: resources.offline,
        value: 2,
      },
    ];
  }

  componentDidMount() {
    const { agentUserListAction, client } = this.props;
    agentUserListAction(client);
  }

  getData() {
    var data = this.props.agentUserList.map(function (item) {
      return { key: item.userName, value: item.userName };
    });
    var userName = this.props.client.userName;
    data.splice(0, 0, {
      key: userName,
      value: userName,
    });
    return data;
  }

  getQueryVariable(variable) {
    var query = window.location.search.substring(1);
    //console.log(query); //"app=article&act=news_content&aid=160990"
    var vars = query.split("&");
    //console.log(vars); //[ 'app=article', 'act=news_content', 'aid=160990' ]
    for (var i = 0; i < vars.length; i++) {
      var pair = vars[i].split("=");
      //console.log(pair); //[ 'app', 'article' ][ 'act', 'news_content' ][ 'aid', '160990' ]
      if (pair[0] === variable) {
        return pair[1];
      }
    }
    return false;
  }

  render() {
    //const query = new URLSearchParams(this.props.location.search);
    //console.log("query", query, this.props.location);
    var status = this.getQueryVariable("status");
    //console.log("query status", status);
    return (
      <div className="float-right">
        <DropdownButtonBinder
          title={resources.user}
          id="agentUserList"
          bsStyle="info"
          dataSource={this.getData()}
          onSelect={(userName) => this.props.userFilter(userName)}
        />
        <RadioGroup
          dataSource={this.dataSource}
          name={"deviceStatus"}
          defaultValue={status || 0}
          onChange={(value) => this.props.deviceStatusFliter(value)}
        />
         
      </div>
    );
  }
}
