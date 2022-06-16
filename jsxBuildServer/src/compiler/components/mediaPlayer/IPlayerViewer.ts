
export interface IPlayerViewer {
  //准备第一帧数据,为播放提前做准备
  prepare(url: string);
  //数据是否准备好可以进行播放，如果是正在播放返回false
  canPlay();
  //执行播放
  play();
  //播放完成事件
  endEvent: () => void;

}

export class PlayerViewer implements IPlayerViewer {
  _canPlay: boolean;

  videoElment: HTMLVideoElement;

  constructor(videoElment: HTMLVideoElement) {
    this.videoElment = videoElment;
  }

  async prepare(url: string) {
    this.videoElment.style.visibility = "hidden";
    this.videoElment.src = url;
    this.videoElment.load();
    this._canPlay = true;
  }

  canPlay() {
    return this.canPlay;
  }

  fullscreen(){
    var elem = this.videoElment
    if (elem.requestFullscreen) {
      elem.requestFullscreen();
    } 
  }
  async play() {
    this.videoElment.style.visibility = "visible";
    //this.fullscreen();
    const player = this.videoElment;
    player.addEventListener(
      "ended",
      () => {
        this.endEvent && this.endEvent();
      },
      { once: true }
    );

    var playPromise = player.play();

    if (playPromise !== undefined) {
      playPromise
        .then((_) => {
          // Automatic playback started!
          // Show playing UI.
          //console.log("play ok");
        })
        .catch((error) => {
          // Auto-play was prevented
          // Show paused UI.
          console.log("play error", error);
          this.endEvent && this.endEvent();
        });
    }

    // this.sourceBuffer2.updateEnd = async () => {
    //   // console.log("this.videoThunk.segment", this.videoThunk.segment);
    // };

    this._canPlay = false;
  }

  endEvent: () => void;
}
