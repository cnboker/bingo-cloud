import React from "react";
import videojs from "video.js";
import "video.js/dist/video-js.css";
import "videojs-playlist/dist/videojs-playlist";

//require playlist, otherwise not play next
export const VideoJS = (props) => {
  const videoRef = React.useRef(null);
  const playerRef = React.useRef(null);
  const { playlist, onReady, exit } = props;
  let sourceCount = playlist.length;
  console.log('playlist',playlist) 
  const videoJsOptions = {
    // lookup the options in the docs for more options
    //支持自动播放只能静音， chrome 有限制导致
    autoplay: "muted",
    controls: true,
    // responsive: true,
    fluid: true,
    preload: 'auto'
  };

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
      player.on("ended", () => {
        //chrome fix
        const index = player.playlist.currentIndex();
        if (index === sourceCount - 1) {
          exit && exit();
        }
      });

      player.on("playing", (event) => {
        console.log("playing", event);
        let n = player.playlist.currentIndex() + 1;

        if (n > 0 && n < sourceCount) {
         
          // need to actually determine the correct source here
          let preloadlocation = 'http://localhost/' + playlist[n].sources[0].src;

          var preloadLink = document.createElement("link");
          preloadLink.href = preloadlocation;
          preloadLink.rel = "preload";
          preloadLink.as = "video";
          document.head.appendChild(preloadLink);
          console.log('preloadLink..',preloadLink)
        }
      });

      //player.on("ended", exit);
      player.playlist(playlist);

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
