import React from "react";
import videojs from "video.js";
import "video.js/dist/video-js.css";
import "videojs-playlist/dist/videojs-playlist";

//require playlist, otherwise not play next
export const VideoJS = (props) => {

    const videoRef = React.useRef(null);
    const playerRef = React.useRef(null);
    const { options, onReady } = props;

    React.useEffect(() => {
    // make sure Video.js player is only initialized once
        if (!playerRef.current) {
            const videoElement = videoRef.current;
            if (!videoElement) 
                return;
      
            const player = playerRef.current = videojs(videoElement, options, () => {
                console.log("player is ready");
                onReady && onReady(player);
            });
            const sources = options.sources.map((x) => {
                return { sources: [x], poster: x.poster };
            });
            //console.log('sources', sources)
            player.playlist(sources);
            player.playlist.autoadvance(0);} 
    },
    [options]);

    // Dispose the Video.js player when the functional component unmounts
    React.useEffect(() => {
        return () => {
            if (playerRef.current) {
                playerRef
                    .current
                    .dispose();
                playerRef.current = null;
            }
        };
    }, []);

    return (
        <div data-vjs-player>
            <video ref={ videoRef } className="video-js vjs-big-play-centered"/>
        </div>
    );
};

export default VideoJS;
