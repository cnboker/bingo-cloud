import React from "react";
import TextPlayer from "./TextPlayer";
import ImagePlayer from "./ImagePlayer";
import VideoPlayer from "./VideoPlayer";
import WebpagePlayer from "./WebpagePlayer";

export default class Region extends React.Component {
  renderPlayer() {
    const { contentType } = this.props.content;
    //clone content;
    const content = Object.assign({},this.props.content);
    const props = {...this.props,content};
    //console.log('region', props)
    if (contentType === 1) {
      //Text
      return <TextPlayer {...props} />;
    } else if (contentType === 2) {
      //Image
      return <ImagePlayer {...props}/>;
    } else if (contentType === 3) {
      //Media
      return <VideoPlayer {...props}/>;
    } else if (contentType === 5) {
      //Clock
      return <div />;
    } else if (contentType === 6) {
      //Webpage
      return <WebpagePlayer {...props} />;
    } else {
      return <div />;
    }
  }
  render() {
    
    const { position } = this.props;
    const pos = {
      position: "absolute",
      left: `${position.left}px`,
      top: `${position.top}px`,
      width: `${position.width}px`,
      height: `${position.height}px`,
      overflow: "hidden"
    };
    // if (backgroundColor) {
    //   pos.backgroundColor = backgroundColor;
    // }
    return <div style={pos}>{this.renderPlayer()}</div>;
  }
}

Region.defaultProps = {
  position: {
    left: 0,
    top: 0,
    width: 718,
    height: 1280
  },
  zIndex: 35,
  lastUpdateDateTime: "0001-01-01T00:00:00",
  content: {
    switchEffect: 1,
    duration: 10,
    isTile: false,
    interval: 5,
    images: [
      "/UploadFiles/file1013/images/7.jpg",
      "/UploadFiles/file1013/images/8.jpg"
    ],
    contentType: 2
  }
};
