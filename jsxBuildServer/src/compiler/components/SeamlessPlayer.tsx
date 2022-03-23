import React, { useRef, useState } from "react";
import { IImageProps, IPageProps, IPlayProps, IVideoProps } from "../Meta";
import { ImagePlayer } from "./ImagePlayer";
import { PagePlayer } from "./PagePlayer";
import VideoPlayer from "./myPlayer";
import { TransitionGroup, CSSTransition } from "react-transition-group";
import { fetchNext } from "./Viewport";

export type SeamlessDataProps = (IVideoProps | IImageProps | IPageProps) ;

export type IDataSource = {
  source: Array<IPlayProps>;
};

export type SeamlessPlayerProps = SeamlessDataProps & {
  currentExit: (label: string) => void;
};

export const SeamlessPlayer: React.FC<SeamlessDataProps & IDataSource> = (props) => {
  const [viewData, setViewData] = useState<SeamlessDataProps>();
  const {source, ...rest} = props
  function exit(label) {
    const sourceItem = fetchNext(source);
    setViewData(sourceItem);
  }

  const { type } = rest;
  let player = <ViewPlayer {...props} />;
  //video通过下面代码实现无缝播放
  if (type === "video") {
    return <>{player}</>;
  }
  return (
    <TransitionGroup>
      <CSSTransition
      appear
      unmountOnExit
      in={true}
      timeout={800}
      classNames={"slider"}
    >
      <div className={`view`}>{player}</div>
    </CSSTransition>
    </TransitionGroup>
  );
};

const ViewPlayer: React.FC<SeamlessDataProps& IDataSource> = ({
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


