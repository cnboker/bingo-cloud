import React from "react";
import {fileExistWebOSUrls} from "../../lib/util";

var uniqueID = (function () {
  var id = 1; // This is the private persistent value
  // The outer function returns a nested function that has access to the
  // persistent value.  It is this nested function we're storing in the variable
  // uniqueID above.
  return function () {
    return id++;
  }; // Return and increment
})(); // Invoke the outer function after defining it.

export default class VideoPlayer extends React.Component {
  constructor(props) {
    super(props);
    this.CURRENT_PLAYING = 0;
    this.urls = [];
  }

  // remove(item) {   var index = vidComponents.indexOf(item);   if (index > -1) {
  //     vidComponents.splice(index, 1);   } }

  geturls() {
    var {mediaUrls} = this.props.content;
    return fileExistWebOSUrls(mediaUrls);
  }

  componentDidMount() {
    console.log("video props", this.props);
    this.vid1.name = "vid" + uniqueID();
    this.vid2.name = "vid" + uniqueID();

    this.urls = this.geturls();
    // this.videoError(this.vid1) this.videoError(this.vid2)
    this
      .vid1
      .addEventListener("ended", () => {
        this.vid2.muted = false;
        this.resetPlayer(this.vid1);
        if (this.CURRENT_PLAYING >= this.urls.length && this.props.onEnd) {
          this
            .props
            .onEnd("video");
          return;
        }
        this
          .vid2
          .play();
      }, false);

    this
      .vid2
      .addEventListener("ended", () => {
        this.vid1.muted = false;
        this.resetPlayer(this.vid2);
        //console.log("vid2 play end", this.CURRENT_PLAYING);
        if (this.CURRENT_PLAYING >= this.urls.length && this.props.onEnd) {
          this
            .props
            .onEnd("video");
          return;
        }
        this
          .vid1
          .play();
      }, false);

    this
      .vid1
      .addEventListener("play", () => {
        console.log(`${this.vid1.name} play, url:${this.vid1.src}`);
        this.vid1.muted = false;
        this.vid2.muted = true;

        this.vid1.style.visibility = "visible";
        this.vid2.style.visibility = "hidden";

        this.CURRENT_PLAYING = this.CURRENT_PLAYING + 1;
        if (this.CURRENT_PLAYING < this.urls.length) {
          this.vid2.src = this.urls[this.CURRENT_PLAYING];
          this
            .vid2
            .load();
          //console.log("vid2 load...", this.vid2.src);
        } else {
          //最后一个播放

          this
            .props
            .requestPreplay({action: "prePlay", value: this.vid1.name});
        }
      });

    this
      .vid2
      .addEventListener("play", () => {
        console.log(`${this.vid2.name} play, url:${this.vid2.src}`);
        this.vid2.muted = false;
        this.vid1.muted = true;
        this.vid2.style.visibility = "visible";
        this.vid1.style.visibility = "hidden";

        this.CURRENT_PLAYING = this.CURRENT_PLAYING + 1;
        if (this.CURRENT_PLAYING < this.urls.length) {
          //console.log("vid1 load...");
          this.vid1.src = this.urls[this.CURRENT_PLAYING];
          this
            .vid1
            .load();
        } else {
          this
            .props
            .requestPreplay({action: "prePlay", value: this.vid2.name});
        }
      });
    this.dataPerpare();
  }

  videoError(videoElement) {
    videoElement.onerror = function () {
      console.log("Error " + videoElement.name + " " + videoElement.error.code + "; details: " + videoElement.error.message, videoElement.src);
    };
  }

  resetPlayer(player) {
    player.style.visibility = "hidden";
    console.log(`${player.name} end, url:${player.src}`);
    player.src = "";
    //player.load();
  }

  componentDidUpdate(prevProps) {
    //console.log('video', prevProps.content !== this.props.content)
    if ( prevProps.content !== this.props.content && 
      prevProps.playerState == this.props.playerState) {  
      console.log("video play componentDidUpdate vid=", this.vid1.name);
      //this.CURRENT_PLAYING = 0;
      //this.dataPerpare();
    }

    if (prevProps.controlVisible !== this.props.controlVisible && this.props.controlVisible) {
      if (this.vid1.src) {
        this
          .vid1
          .play();
      }
    }

    if (prevProps.playerState !== this.props.playerState) {
      const {action, value} = this.props.playerState;
      console.log("programPreplayReducer receive data", action, value);
      //确保是隐藏的组件
      if (action === "prePlay") {
        if (value !== this.vid1.name && value !== this.vid2.name) {
          this.urls = this.geturls();
          if (this.urls.length === 0) 
            return;
          
          this.vid1.src = this.urls[0];
          this
            .vid1
            .load();
        }
      }
    }
  }

  dataPerpare() {
    this.urls = this.geturls();
    if (this.urls.length === 0) 
      return;
    
    this.vid1.src = this.urls[this.CURRENT_PLAYING];
    this
      .vid1
      .load();

    if (this.props.controlVisible) {
      this
        .vid1
        .play();
    }
  }

  isPlaying(video){
    return  video.currentTime > 0 && !video.paused && !video.ended 
    && video.readyState > 2;
  }
  // dataPerpare() {   this.urls = this.geturls();   if (this.urls.length === 0)
  // return;   if (this.props.controlVisible) {     this.vid1.src =
  // this.urls[this.CURRENT_PLAYING];     this.vid1.load();     this.vid1.play();
  // } else {     this.vid1.style.visibility = "hidden";   } }

  render() {
    //console.log("videoplayer render.........");
    return (
      <React.Fragment>
        <video className="vid" ref={c => (this.vid1 = c)} muted="muted"></video>
        <video className="vid" ref={c => (this.vid2 = c)} muted="muted"></video>
      </React.Fragment>
    );
  }
}

VideoPlayer.defaultProps = {
  content: {
    isTile: true,
    mediaUrls: ["/UploadFiles/file1013/video/lego.mp4"],
    contentType: 3
  }
};
