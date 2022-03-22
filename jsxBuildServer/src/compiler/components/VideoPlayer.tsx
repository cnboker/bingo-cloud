import React, { useEffect } from "react";
import { IVideoProps } from "../Meta";
import Player from "./myPlayer";
export default ({ label, autoPlay, url, exit, poster }: IVideoProps) => {
  const playerRef = React.useRef(null);
  const picRef = React.useRef(null);
  const ctxRef = React.useRef(null);

  const computerFrame = () => {
    const width = playerRef.current.videoWidth;
    const height = playerRef.current.videoHeight;
    console.log("size", width, height);
    ctxRef.current.drawImage(playerRef.current, 0, 0);
  };

  const timerCallback = () => {
    if (playerRef.current.paused || playerRef.current.ended) {
      return;
    }
    computerFrame();
    setTimeout(() => {
      timerCallback();
    }, 200);
  };

  return (
    <>
      <Player url={url} autoPlay={autoPlay} exit={exit} label={label} />
    </>
  );
};
