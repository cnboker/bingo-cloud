import React from "react";
import Playlist from "../Playlist";
import Shim from "../Shim";
import data from './image.json'

export default class WebApp extends React.Component {
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
   
    this.setState({
        data:data.channel.playlist[0].programs,
        shim: false,
      });
  }

  render() {
    var shim = this.state.shim;
    return (
      <React.Fragment>
        {shim ? <Shim /> : <Playlist programs={this.state.data}  />}
      </React.Fragment>
    );
  }
}
