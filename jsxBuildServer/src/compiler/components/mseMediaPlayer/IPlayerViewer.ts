import { SourceBuffer2 } from "./ISourceBuffer";
import { IVideoThunkReq, VideoThunkReq } from "./IFileThunkReq";
import { mimeFetch } from "./IVideomime";

export interface IPlayerViewer {
  //准备第一帧数据,为播放提前做准备
  begin(url: string);
  //执行播放
  play();
  //播放快结束需要缓存事件触发
  bufferEvent: () => void;
  //url中的数据获取完成触发该事件
  dataFetchEndEvent: () => void;
  //释放资源
  release();
  playend: () => void;
}

const MIN_BUFFER_TIME = 15; //seconds
export class PlayerViewer implements IPlayerViewer {
  videoThunk: IVideoThunkReq;
  sourceBuffer2: SourceBuffer2;
  videoElment: HTMLVideoElement;
  timer: NodeJS.Timer;

  constructor(videoElment: HTMLVideoElement) {
    this.videoElment = videoElment;
    const mediaSource = new MediaSource();
    this.sourceBuffer2 = new SourceBuffer2(mediaSource);
    this.videoElment.src = URL.createObjectURL(mediaSource);
    this.videoThunk = new VideoThunkReq();

    const player = this.videoElment;

    player.addEventListener("timeupdate", () => {
     
      const player = this.videoElment;
      const playSeekDuration = this.timeRangesToString(player.seekable);

      if (
        player.currentTime > 0 &&
        playSeekDuration - player.currentTime < MIN_BUFFER_TIME
      ) {
        this.dataCheck();
        if (player.currentTime > MIN_BUFFER_TIME) {
          this.sourceBuffer2.clear((player.currentTime * 1) / 2 /* end*/);
        }
      }

      //播放结束
      if (
        player.currentTime > 0 &&
        playSeekDuration - player.currentTime < 0.1
      ) {
        player.currentTime = 0;
        this.playend && this.playend();
      }
    });
  }

  playend: () => void;

  release() {
    if (this.timer) {
      clearInterval(this.timer);
    }
    // URL.revokeObjectURL(this.videoElment.src);
  }

  async begin(url: string) {
    const mime = await mimeFetch(url);
    await this.sourceBuffer2.addSourceBuffer(mime, "sequence");
    const data = await this.videoThunk.begin(url);
    await this.sourceBuffer2.appendBuffer(data);
  }

  timeRangesToString(ranges) {
    var s = "";
    for (var i = 0; i < ranges.length; ++i) {
      s += ranges.end(i).toFixed(3);
    }
    return +s;
  }

  async play() {
    const player = this.videoElment;
    player.addEventListener("error", (e) => {
      console.error("player err!", e);
    });
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
        .then(async () => {
       
        })
        .catch((error) => {
          // Auto-play was prevented
          // Show paused UI.
          console.log("play error", error);
        });
    }
  }

  async dataCheck() {
    if (!this.sourceBuffer2.updating) {
      const { index, chunkCount } = this.videoThunk.segment;
      if (index < chunkCount) {
        const chunk = await this.videoThunk.next();
        await this.sourceBuffer2.appendBuffer(chunk);
      } else {
        this.dataFetchEndEvent && this.dataFetchEndEvent();
      }
    }
  }

  bufferEvent: () => void;
  dataFetchEndEvent: () => void;
}
