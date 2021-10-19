import React from "react";
import VideoJS from "./player/components/VideoJS";

export default () => {
    const videoJsOptions = { 
    // lookup the options in the docs for more options
        autoplay: true,
        controls: true,
        responsive: true,
        fluid: true,
        sources: [
            {
                src: "http://127.0.0.1:8888/videos/hike.mp4",
                type: "video/mp4"
            },
            {
                src: "http://127.0.0.1:8888/videos/lg.mp4",
                type: "video/mp4"
            }
        ]
    };

    const handlePlayerReady = player => {
        //playerRef.current = player;
        //playerRef.current.play();
        // you can handle player events here
        player.on("waiting", () => {
            console.log("player is waiting");
        });

        player.on("dispose", () => {
            console.log("player will dispose");
        });
    };

    return (
        <React.Fragment>
            <div>Rest of app here</div>
            <VideoJS options={ videoJsOptions } onReady={ handlePlayerReady } />
        </React.Fragment>
    );
};
