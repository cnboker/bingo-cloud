import React, { useEffect, useState } from "react";
import { IPlayProps } from "../Meta";
import { ImagePlayer } from "./ImagePlayer";
import { PagePlayer } from "./PagePlayer";
import VideoPlayer from "./mseMediaPlayer/Index";
import { TransitionGroup, CSSTransition } from "react-transition-group";
import { fetchNext } from "./Viewport";

//特别注意：CSSTransition中必须增加动态KEY，否则无效果
export type IDataSource = {
  source: Array<IPlayProps>;
};

export const Playlist: React.FC<IDataSource> = (props) => {
  const [currentPlayProps, setCurrentPlayProps] = useState<IPlayProps>();
  const { source } = props;

  const exit = () => {
    setCurrentPlayProps(() => {
      const next = fetchNext(source);
      next.exit = exit;
      return next;
    });
  };

  useEffect(() => {
    setCurrentPlayProps(() => {
      const next = fetchNext(source);
      next.exit = exit;
      return next;
    });
  }, []);

  if (!currentPlayProps) return null;
  const { type, animation } = currentPlayProps;
  let player = <ViewPlayer key={(new Date()).getTime()} {...currentPlayProps} source={source} />;
  //video通过下面代码实现无缝播放
  if (type === "video") {
    return <>{player}</>;
  }
  return (
    <TransitionGroup>
      <CSSTransition
        in={true}
        appear={true}
        unmountOnExit
        timeout={1500}
        classNames={animation}
        key={(new Date()).getTime()}
      >
        <div className={`view`} >{player}</div>
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
