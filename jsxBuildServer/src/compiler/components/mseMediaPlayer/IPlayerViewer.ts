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

const MIN_BUFFER_TIME = 30; //seconds
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
  }

  task() {
    const player = this.videoElment;
    const playSeekDuration = this.timeRangesToString(player.seekable);

    if (
      player.currentTime > 0 &&
      playSeekDuration - player.currentTime < MIN_BUFFER_TIME
    ) {
      console.log(
        "timeupdate",
        playSeekDuration,
        player.currentTime,
        playSeekDuration - player.currentTime
      );
      this.dataCheck();
    }

    //播放结束
    if (player.currentTime > 0 && playSeekDuration - player.currentTime < 0.1) {
      player.currentTime = 0;
      this.playend && this.playend();
    }
  }

  playend: () => void;

  release() {
    if (this.timer) {
      clearInterval(this.timer);
    }
    // URL.revokeObjectURL(this.videoElment.src);
  }

  async begin(url: string) {
   // const mime = await mimeFetch(url);
    var mimeCodec = 'video/mp4; codecs="avc1.64001F"';
    await this.sourceBuffer2.addSourceBuffer(mimeCodec, "sequence");
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

  

    player.addEventListener("error", async (e) => {
      //@type-script ignore
      console.info("player err!", e.target);
      //await this.play();
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
        .then(async () => {})
        .catch((error) => {
          // Auto-play was prevented
          // Show paused UI.
          console.log("play error", error);
        });
    }

    this.task();
    this.timer = setInterval(() => {
      if (player.currentTime > MIN_BUFFER_TIME) {
        this.sourceBuffer2.clear(player.currentTime - MIN_BUFFER_TIME /* end*/);
      }
      this.task();
    }, 500);

  }

  async dataCheck() {
    //if (!this.sourceBuffer2.updating) {
      const { index, chunkCount } = this.videoThunk.segment;
      if (index < chunkCount) {
        this.dataFetchEndEventTriggered = false;
        const chunk = await this.videoThunk.next();
        await this.sourceBuffer2.appendBuffer(chunk);
      } else {
        if (!this.dataFetchEndEventTriggered) {
          this.dataFetchEndEventTriggered = true;
          this.dataFetchEndEvent && this.dataFetchEndEvent();
        }
      }
    }
 // }
  dataFetchEndEventTriggered: boolean;
  bufferEvent: () => void;
  dataFetchEndEvent: () => void;
}
