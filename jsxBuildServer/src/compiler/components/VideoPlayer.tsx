import React, { useEffect } from "react"
import { IVideoProps } from '../Meta'
import videojs from "video.js";
import "video.js/dist/video-js.css";

export const VideoPlayer: React.FC<IVideoProps> = ({ url, exit,poster }) => {
    const videoRef = React.useRef(null);
    const playerRef = React.useRef(null);
    console.log('poster', poster)
    const videoJsOptions = {
        // lookup the options in the docs for more options
        //支持自动播放只能静音， chrome 有限制导致
        autoplay: "muted",
        controls: true,
        // responsive: true,
        fluid: true,
        preload: 'auto'
    };

    useEffect(() => {
        // make sure Video.js player is only initialized once
        if (!playerRef.current) {
            const videoElement = videoRef.current;
            if (!videoElement) return;

            const player = (playerRef.current = videojs(
                videoElement,
                videoJsOptions,
                () => {
                    console.log("player is ready");
                    const timer = setTimeout(function () {
                        clearTimeout(timer)
                        //@ts-ignore
                        player.fluid('true')
                    }, 500);
                }
            ));
            //@ts-ignore
            player.on('ended', () => {
                exit && exit()
            })

        } else {
            // you can update player here [update player through props]
            // const player = playerRef.current;
            // player.autoplay(options.autoplay);
            // player.src(options.sources);
        }
    }, [videoJsOptions]);

    // Dispose the Video.js player when the functional component unmounts
    React.useEffect(() => {
        const player = playerRef.current;

        return () => {
            if (player) {
                player.dispose();
                playerRef.current = null;
            }
        };
    }, [playerRef]);

    return (
        <div data-vjs-player>
            <video ref={videoRef} className="video-js vjs-big-play-centered" poster={poster} >
                <source src={url} type="video/mp4" />
            </video>
        </div>
    )

}


