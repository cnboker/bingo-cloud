import React from "react";
import DoubleProgram from "./DoubleProgram";
import WeatherPlayer from "./WeatherPlayer";

export default class Playlist extends React.Component {
  componentDidMount() {}

  render() {
    const { programs } = this.props;
    if(programs.length === 0)return null;
    console.log('programs', programs)
    return (
      <React.Fragment>
      
        <WeatherPlayer city={programs[0].location} />
        <DoubleProgram {...this.props}/>
      </React.Fragment>
    );
  }
}
