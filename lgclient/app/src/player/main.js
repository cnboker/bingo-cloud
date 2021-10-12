import React from "react";
import { ContentWorker } from "lgservice";
import Playlist from "./components/Playlist";
import Shim from "./components/Shim";

const worker = new ContentWorker();

export default class Main extends React.Component {
  constructor() {
    super();
    this.state = {
      data: {
        programs: []
      },
      shim: true,
      key:0 //key change recreate playlist component
    };
  }

  componentDidMount() {
    var self = this;
    worker.execute(data => {
      console.log("program data", JSON.stringify(data.channel.playlist[0]));    
      data = data.channel.playlist[0];
      if (data.programs.length === 0) return;
      self.setState({
        data,
        shim: false,
      });
      
    });
  }

  render() {
    var shim = this.state.shim;
    return (
      <React.Fragment>
        {shim ? <Shim /> : <Playlist {...this.state.data}  />}
      </React.Fragment>
    );
  }
}
