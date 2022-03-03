import React, { useEffect } from "react"
import { IVideoProps } from '../Meta'
import videojs from "video.js";
import "video.js/dist/video-js.css";

const VideoPlayer = ({ url, exit, poster }: IVideoProps) => {
    const videoRef = React.useRef(null);
    const playerRef = React.useRef(null);

    const videoJsOptions = {
        // lookup the options in the docs for more options
        //支持自动播放只能静音， chrome 有限制导致
        //autoplay: autoPlay || false,
        //autoSetup: true,
        autoplay: true,
        muted: true,
        controls: false,
        //responsive: true,
        fluid: true,
        preload: 'metadata',
        loadingSpinner: false,
        html5: {
            nativeControlsForTouch: false,
            nativeAudioTracks: false,
            nativeVideoTracks: false,
            hls: {
                limitRenditionByPlayerDimensions: false,
                smoothQualityChange: true,
                bandwidth: 6194304,
                overrideNative: true
            }
        }
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
                    console.log('play ready', url)
                    //@ts-ignore
                    player.load()

                }
            ));
            //player.autoplay(videoJsOptions.autoplay);
            //@ts-ignore
            player.on('ended', () => {
                exit && exit()
            })
            // if (autoPlay) {
            //     //@ts-ignore
            //     player.play()
            // }
        } else {
            // you can update player here [update player through props]
            const player = playerRef.current;
            // if (autoPlay) {
            //     //@ts-ignore
            //     player.play()
            // }
        }
    }, [url]);

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


export default React.memo(VideoPlayer, (prev, next) => {
    console.log('propsAreEqual', prev, next)
    return prev.url === next.url
})