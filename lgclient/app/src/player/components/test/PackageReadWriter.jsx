import React from "react";
import { ContentWorker } from "lgservice";
import Playlist from "../Playlist";

var worker = new ContentWorker();

export default class PackageReadWriter extends React.Component {
  constructor() {
    super();
    this.state = {
      data: {
        programs: []
      }
    };
  }

  componentDidMount() {
    var self = this;
    worker.execute(data => {
      console.log("program date", worker.package.channel.playlist[0]);
      self.setState({
        data: worker.package.channel.playlist[0]
      });
    });
    // var json = require('lgservice/dist/__test__/content.json');
    // console.log('playlist',json.channel.playlist[0])
    // this.setState({data:json.channel.playlist[0]})
  }

  render() {
    return (
      <Playlist data={this.state.data}></Playlist>
    );
  }
}
