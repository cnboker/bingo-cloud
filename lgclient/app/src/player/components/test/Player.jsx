import React from "react";
import ImagePlayer from '../ImagePlayer';
import TextPlayer from '../TextPlayer';

export default class Player extends React.Component {
  componentDidMount() {}
  render() {
    return (
      <React.Fragment>
       <TextPlayer/>
      </React.Fragment>
    );
  }
}
