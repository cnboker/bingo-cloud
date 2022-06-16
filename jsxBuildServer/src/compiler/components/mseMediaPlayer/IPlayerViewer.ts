import { SourceBuffer2 } from "./ISourceBuffer";
import { IVideoThunkReq, VideoThunkReq } from "./IFileThunkReq";
import { mimeFetch } from "./IVideomime";

export interface IPlayerViewer {
  
  //准备第一帧数据,为播放提前做准备
  prepare(url: string);
  //数据是否准备好可以进行播放，如果是正在播放返回false
  canPlay();
  //执行播放
  play();
  //播放完成事件
  endEvent: () => void;
  //释放资源
  release();
}

export class PlayerViewer implements IPlayerViewer {
  _canPlay: boolean;
  videoThunk: IVideoThunkReq;
  sourceBuffer2: SourceBuffer2;
  videoElment: HTMLVideoElement;
  timer: NodeJS.Timer;
  constructor(videoElment: HTMLVideoElement) {
    this.videoElment = videoElment;
    this.videoElment.crossOrigin = "anonymous";
    const mediaSource = new MediaSource();
    this.sourceBuffer2 = new SourceBuffer2(mediaSource);
    this.videoElment.src = URL.createObjectURL(mediaSource);
    this.videoThunk = new VideoThunkReq();

    const player = this.videoElment;
    player.addEventListener(
      "timeupdate",
      () => {
        const player = this.videoElment;
        const playSeekDuration = this.timeRangesToString(player.seekable);

        if (
          player.currentTime > 0 &&
          playSeekDuration - player.currentTime < 0.1
        ) {
          console.log("play end", playSeekDuration, player.currentTime);
          this.videoElment.pause();
        //  this.sourceBuffer2.clear(playSeekDuration);
         
          player.currentTime = 0;
          this.endEvent && this.endEvent();
        }
      },
     
    );
  }
  release() {
    if (this.timer) {
      clearInterval(this.timer);
    }
   // URL.revokeObjectURL(this.videoElment.src);
  }

  async prepare(url: string) {
    this.videoElment.style.visibility = "hidden";
   
    //释放资源
    //URL.revokeObjectURL(this.videoElment.src);
    const mime = await mimeFetch(url);
    await this.sourceBuffer2.addSourceBuffer(mime, "sequence");
    //instance videoThunk
    console.log(this.videoElment.id, 'begin....')
    const data = await this.videoThunk.begin(url);
    //console.log("prepare", url, this.videoThunk.segment);
    this.sourceBuffer2.appendBuffer(data);
    this._canPlay = true;
  }

  canPlay() {
    return this.canPlay;
  }

  timeRangesToString(ranges) {
    var s = "";
    for (var i = 0; i < ranges.length; ++i) {
      s += ranges.end(i).toFixed(3);
    }
    return +s;
  }

  async play() {
    this.videoElment.style.visibility = "visible";
    const player = this.videoElment;
    player.addEventListener(
      "play",
      () => {
        console.log("player play!");
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
          this.dataCheck();
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

  dataCheck() {
    this.timer = setInterval((async () => {
      if (!this.sourceBuffer2.updating) {
        const { index, chunkCount } = this.videoThunk.segment;
        if (index < chunkCount) {
          const chunk = await this.videoThunk.next();
          this.sourceBuffer2.appendBuffer(chunk);
        }else{
          clearInterval(this.timer)
          this.timer = null;
        }
      }
    }).bind(this), 500);
  }
  endEvent: () => void;
}
