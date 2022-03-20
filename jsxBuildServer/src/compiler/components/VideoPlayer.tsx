import React, { useEffect } from "react";
import { IVideoProps } from "../Meta";

export default ({ label, autoPlay, url, exit, poster }: IVideoProps) => {
  const playerRef = React.useRef(null);
  const picRef = React.useRef(null);
  const ctxRef = React.useRef(null)
  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    console.log("load!!!", url);
    //@ts-ignore
    //player.src(url);
    
   
  }, []);

  async function playVideo() {
    try {
      await playerRef.current.play();
    } catch (err) {
      console.log("err", err);
    }
  }

  const computerFrame = () => {
    const width = playerRef.current.videoWidth;
    const height = playerRef.current.videoHeight;
      console.log('size',width,height)
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

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    //@ts-ignore
    if (autoPlay) {
      //这里不能用 player.on, 因为再循环播放的时候会出现播放结束url不对的情况
      //@ts-ignore
      player.addEventListener(
        "ended",
        () => {
          console.log("end!!!!", url);
          exit && exit(label);
        },
        { once: true }
      );
    //   player.addEventListener(
    //     "play",
    //     () => {
    //       ctxRef.current = picRef.current.getContext("2d");
    //       timerCallback();
    //     },
        
    //   );
      console.log("play!!!", url);
      player.classList.remove('view-hidden')
      playVideo();
    }else{
        player.classList.add('view-hidden')
        player.load();
    }
    
  }, [autoPlay]);

  // Dispose the Video.js player when the functional component unmounts
  React.useEffect(() => {
    const player = playerRef.current;
    return () => {
      if (player) {
        // player.dispose();
        playerRef.current = null;
      }
    };
  }, [playerRef]);

  return (
    <>
      <video ref={playerRef} muted className="view">
        <source src={url} type="video/mp4" />
      </video>
    </>
  );
};

// export default React.memo(VideoPlayer, (prev, next) => {
//    // console.log('propsAreEqual', prev, next)
//     return prev.url === next.url && prev.autoPlay === next.autoPlay
// })
