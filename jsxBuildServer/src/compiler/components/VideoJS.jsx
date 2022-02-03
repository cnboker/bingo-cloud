import React from "react";
import videojs from "video.js";
import "video.js/dist/video-js.css";
import "videojs-playlist/dist/videojs-playlist";

//require playlist, otherwise not play next
export const VideoJS = (props) => {
  const videoRef = React.useRef(null);
  const playerRef = React.useRef(null);
  const { sources, onReady, exit } = props;
  const _s =sources.map((x) => {
    const url = new URL(x.src);
    return {  ...x ,src: url.pathname,};
  })
  const videoJsOptions = {
    // lookup the options in the docs for more options
    autoplay: true,
   // controls: true,
   // responsive: true,
  //  fluid: true,
    sources: _s,
  };
  //console.log('videoJsOptions',videoJsOptions)
  React.useEffect(() => {
    // make sure Video.js player is only initialized once
    if (!playerRef.current) {
      const videoElement = videoRef.current;
      if (!videoElement) return;

      const player = (playerRef.current = videojs(
        videoElement,
        videoJsOptions,
        () => {
          console.log("player is ready");
          onReady && onReady(player);
        }
      ));
      player.on('ended',exit)
      console.log('player', player)
      player.playlist(_s);
      player.playlist.autoadvance(0);
    
    }
  }, [videoJsOptions]);

  // Dispose the Video.js player when the functional component unmounts
  React.useEffect(() => {
    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, []);

  return (
    <div data-vjs-player>
      <video ref={videoRef} className="video-js vjs-big-play-centered" />
    </div>
  );
};
