import { IPlayProps, IVideoProps } from "src/compiler/Meta";
import { fetchNext, peek } from "../Viewport";
import { IPlayerViewer, PlayerViewer } from "./IPlayerViewer";

export interface IPlayerController {
  //url:第一个视频url,
  run(url: string, meideInfoList: Array<IPlayProps>, exit: () => void);
}

export class PlayerControler implements IPlayerController {
  source: Array<IPlayProps>;
  player1: IPlayerViewer;
  player2: IPlayerViewer;

  constructor(videoElment1: HTMLVideoElement, videoElment2: HTMLVideoElement) {
    this.player1 = new PlayerViewer(videoElment1);
    this.player2 = new PlayerViewer(videoElment2);
    videoElment1.style.visibility = "hidden";
    videoElment2.style.visibility = "hidden";
  }

  async run(url: string, source: Array<IPlayProps>, exit: () => void) {
    let nextVideo;
    this.source = source;
    await this.player1.prepare(url);
    this.player1.play();
    //console.log('player1 play')
    this.player1.endEvent = async () => {
      // console.log('player1 stop')
      if (this.player2.canPlay()) {
        //  console.log('player2 play')
        this.player2.play();
      } else {
        exit && exit();
      }
      nextVideo = this.queryNextVideo();
      this.player1.release();
      if (nextVideo) {
        console.log("player1 prepare", nextVideo.url);
        this.player1.prepare(nextVideo.url);
      }
    };

    nextVideo = this.queryNextVideo();
    if (nextVideo) {
      // console.log('player2 prepare')
      await this.player2.prepare(nextVideo.url);
      this.player2.endEvent = async () => {
        if (this.player1.canPlay()) {
          console.log("player1 play");
          this.player1.play();
        } else {
          exit && exit();
        }
        nextVideo = this.queryNextVideo();
        this.player2.release();
        if (nextVideo) {
          //  console.log('player2 prepare')
          this.player2.prepare(nextVideo.url);
        }
      };
    }
  }

  private queryNextVideo(): IVideoProps {
    let nextProps: IVideoProps = peek(this.source);
    if (nextProps.type !== "video") return null;
    return fetchNext(this.source);
  }
}
