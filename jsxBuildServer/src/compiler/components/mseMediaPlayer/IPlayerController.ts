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

  constructor(videoElment1: HTMLVideoElement) {
    this.player1 = new PlayerViewer(videoElment1);
  }

  async run(url: string, source: Array<IPlayProps>, exit: () => void) {
    let nextVideo;
    this.source = source;
    await this.player1.begin(url);
    console.log('begin play...')
    this.player1.play();
    this.player1.dataFetchEndEvent = async ()=>{
      nextVideo = this.queryNextVideo();
      if (nextVideo) {
        console.log("player1 prepare", nextVideo.url);
        await this.player1.begin(nextVideo.url);
      }
    }

    this.player1.playend = ()=>{
      exit && exit();
    }

    this.player1.bufferEvent = async () => {
      
    };
  }

  private queryNextVideo(): IVideoProps {
    let nextProps: IVideoProps = peek(this.source);
    if (nextProps.type !== "video") return null;
    return fetchNext(this.source);
  }
}
