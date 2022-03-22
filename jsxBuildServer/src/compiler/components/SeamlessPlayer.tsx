import React, { useRef, useState } from "react";
import { IImageProps, IPageProps, IPlayProps, IVideoProps } from "../Meta";
import { ImagePlayer } from "./ImagePlayer";
import { PagePlayer } from "./PagePlayer";
import VideoPlayer from "./myPlayer";
import { TransitionGroup, CSSTransition } from "react-transition-group";
import { fetchNext, peek } from "./Viewport";

export type SeamlessDataProps = {
  playProps: IVideoProps | IImageProps | IPageProps;
  //只能放视频数据
  nextProps: IVideoProps | IImageProps | IPageProps;
};

export type IDataSource = {
  source: Array<IPlayProps>;
};

export type SeamlessPlayerProps = SeamlessDataProps & {
  currentExit: (label: string) => void;
};

export const SeamlessPlayer: React.FC<SeamlessDataProps & IDataSource> = ({
  source,
  playProps,
  nextProps,
}) => {
  const [viewData, setViewData] = useState<SeamlessDataProps>({
    playProps,
    nextProps,
  });

  function exit(label) {
    
    //第一次更新useState增加cssTrainsation进出效果
    setViewData((cur) => {
      const { playProps, nextProps } = cur;
      //playProps播放完成， playProps需要准备下一个数据， nextProps需要开始播放
      if (playProps.label === label) {
        nextProps.autoPlay = true;
        playProps.autoPlay = false;
      } else {
        playProps.autoPlay = true;
        nextProps.autoPlay = false;
      }
      console.log("first cur", cur);
      return { ...cur };
    });
    //第二次更新轮询数据,通过延时的方法来解决，这里的延时数据必须大于CSSTransition里面的timeout,但必须小于轮询周期(image's duration)
    delay(1000, () => {
      setViewData((cur) => {
        const sourceItem = fetchNext(source, false);
        const { playProps } = cur;

        //playProps播放完成， playProps需要准备下一个数据， nextProps需要开始播放
        if (playProps.label === label) {
          cur.playProps = sourceItem
        } else {
          cur.nextProps = sourceItem;
        }
        console.log("cur", cur);
        return { ...cur };
      });
    });
  }

  const delay = (timeout, cb) => {
    const timer: ReturnType<typeof setTimeout> = setTimeout(() => {
      if (cb) {
        cb();
      }
    }, timeout);
    return () => clearTimeout(timer);
  };

  return (
    <TransitionGroup>
      <SeamlessVideoPlayer
        playProps={viewData.playProps}
        nextProps={viewData.nextProps}
        currentExit={exit}
      />
    </TransitionGroup>
  );
};

const SeamlessVideoPlayer: React.FC<SeamlessPlayerProps> = ({
  playProps,
  nextProps,
  currentExit,
}) => {
  playProps.exit = nextProps.exit = currentExit;

  return (
    <>
      <EffectionLayer {...playProps} />
      <EffectionLayer {...nextProps} />
    </>
  );
};

const ViewPlayer: React.FC<IVideoProps | IImageProps | IPageProps> = ({
  type,
  ...rest
}) => {
  let Component;
  switch (type) {
    case "image":
      Component = ImagePlayer;
      break;
    case "page":
      Component = PagePlayer;
      break;
    case "video":
      Component = VideoPlayer;
      break;
    default:
    //Component = null
  }

  return Component && <Component {...rest} />;
};

const EffectionLayer: React.FC<IVideoProps | IImageProps | IPageProps> = (
  props
) => {
  const { type, autoPlay, label } = props;
  let player = <ViewPlayer {...props} />;
   //video通过下面代码实现无缝播放
  if (type === "video") {
    return (
      <>{player}</>
    );
  }
  return (
    <CSSTransition
      appear
      unmountOnExit
      in={autoPlay}
      timeout={800}
      classNames={"slider"}
    >
      <div className={`view`}>{player}</div>
    </CSSTransition>
  );
};
