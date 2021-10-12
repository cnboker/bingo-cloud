import React from "react";
import ReduxRegion from "../reduxRegion";

export default class Program extends React.Component {

  onEnd(type) {
    //console.log("program onend", type, this.currentProgramPlayCount);
    if (
      type === "video" ||
      (type === "image" && !this.contianVideo(this.props.data)) ||
      (type === "text" && !this.contianVideo(this.props.data))
    ) {
      this.currentProgramPlayCount--;
      if (this.currentProgramPlayCount > 0) {
        console.log('forceupdate')
        this.forceUpdate();
        
      } else {
        if (this.props.onEnd) {
          this.props.onEnd(this.props.name);
        }
      }
    }
  }

  contianVideo(program) {
    return (
      program.regions.filter(x => {
        return x.content.contentType === 3;
      }).length > 0
    );
  }

  componentDidUpdate(prevProps) {
    //切换界面的时候重置playcount, 可能是data便切换也可能是autoPlay变切换
    if (
      prevProps.data !== this.props.data ||
      prevProps.controlVisible !== this.props.controlVisible
    ) {
      console.log("program componentDidUpdate", this.props.name);
      this.currentProgramPlayCount = this.props.data.PlayCount;
      this.onlyOne = false;
    }
  }

  //只给一个region赋值emitter, 如果包含video优先赋值
  getAllowSendPreplayMessage(x) {
    //console.log("content emitter", x.content.contentType, this.props.emitter);
    this.onlyOne = false;
    var allowSendPreplayMessage = false;
    if (x.content.contentType === 3) {
      this.onlyOne = true;
      allowSendPreplayMessage = true;
    } else {
      if (!this.onlyOne && !this.contianVideo(this.props.data)) {
        this.onlyOne = true;
        allowSendPreplayMessage = true;
      }
    }
    return allowSendPreplayMessage;
  }

  regionRender() {
    if (!this.props.data) return null;
    var regions = this.props.data.regions;
    var maxDuration = Math.max.apply(
      Math,
      regions.map(o => {
        return o.content.duration;
      })
    );

    return this.props.data.regions.map((x, index) => {
      var allowSendPreplayMessage = this.getAllowSendPreplayMessage(x);
      
      return (
        <ReduxRegion
          {...x}
          {...{
            maxDuration,
            controlVisible: this.props.controlVisible,
            allowSendPreplayMessage
          }}
          key={index}
          onEnd={this.onEnd.bind(this)}
        />
      );
    });
  }

  render() {
    //console.log("Program render", this.props.name);
    return <React.Fragment>{this.regionRender()}</React.Fragment>;
  }
}

Program.defaultProps = {
  data: {
    location: "null",
    programid: 1031,
    name: "节目1",
    playTime: "",
    endTime: "",
    Duration: 15,
    PlayCount: 1,
    displayTime: false,
    backgroundType: 0,
    backgroundContent: "",
    backgroundAudio: "",
    mute: false,
    isTile: true,
    regions: [
      {
        position: {
          left: 0,
          top: 0,
          width: 1440,
          height: 810
        },
        zIndex: 8,
        backgroundColor: "gray",
        lastUpdateDateTime: "0001-01-01T00:00:00",
        content: {
          switchEffect: 1,
          duration: 15,
          isTile: false,
          interval: 5,

          images: [
            "/UploadFiles/file1013/images/timg (2).jpg",
            "/UploadFiles/file1013/images/timg (3).jpg",
            "/UploadFiles/file1013/images/timg (7).jpg"
          ],
          contentType: 2
        },
        ExclusiveMode: false
      },
      {
        position: {
          left: 0,
          top: 806,
          width: 1438,
          height: 774
        },
        zIndex: 32,
        lastUpdateDateTime: "0001-01-01T00:00:00",
        content: {
          text: ["Hello world"],
          duration: 15,
          style: {
            fontSize: "150",
            color: "#000000",
            backgroundColor: "blue",
            fontWeight: "0",
            fontFamily: "宋体",
            x: 0,
            y: 0,
            text_align: "left",
            backgroundImage: null,
            rollStyle: 4,
            direction: 2,
            fontSpeed: 6,
            switchTime: 0,
            backgroundType: 1
          },
          contentType: 1
        },
        ExclusiveMode: false
      },
      {
        position: {
          left: 0,
          top: 1582,
          width: 1440,
          height: 978
        },
        zIndex: 31,
        backgroundColor: "black",
        lastUpdateDateTime: "0001-01-01T00:00:00",
        content: {
          isTile: true,

          mediaUrls: ["/UploadFiles/file1013/video/lego.mp4"],
          contentType: 3
        },
        ExclusiveMode: false
      }
    ]
  }
};
