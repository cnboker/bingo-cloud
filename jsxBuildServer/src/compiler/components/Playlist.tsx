import React, { useEffect, useState } from "react";
import { IPlayProps } from "../Meta";
import { ImagePlayer } from "./ImagePlayer";
import { PagePlayer } from "./PagePlayer";
import VideoPlayer from "./myPlayer";
import { TransitionGroup, CSSTransition } from "react-transition-group";
import { fetchNext } from "./Viewport";

export type IDataSource = {
  source: Array<IPlayProps>;
};

export const Playlist: React.FC<IDataSource> = (props) => {
  const [currentPlayProps, setCurrentPlayProps] = useState<IPlayProps>();
  const { source } = props;
  const exit = (label) => {
    console.log("exit event tirger", label);
    setCurrentPlayProps((cur) => {
      const next = fetchNext(source);
      next.exit = exit;
      return next;
    });
  };

  useEffect(() => {
    setCurrentPlayProps((cur) => {
      const next = fetchNext(source);
      next.exit = exit;
      return next;
    });
  }, []);
  if (!currentPlayProps) return null;
  const { type } = currentPlayProps;
  let player = <ViewPlayer {...currentPlayProps} source={source} />;
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
        timeout={1500}
        classNames={"slider"}
      >
        <div className={`view`}>{player}</div>
      </CSSTransition>
    </TransitionGroup>
  );
};

const ViewPlayer: React.FC<IPlayProps & IDataSource> = ({ type, ...rest }) => {
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
