
import React, { useEffect, useRef } from "react";
import { IVideoProps } from "src/compiler/Meta";
import { IDataSource } from "../Playlist";
import { PlayerControler } from "./IPlayerController";

//@ts-ignore
export default ({ url, exit, source }: IVideoProps & IDataSource) => {
    const playerRef = useRef(null);
    const playerCtlRef = useRef(null);
    const canvasRef = useRef(null)
    useEffect(() => {
        // const instance = new PlayerControler(playerRef.current);
        // playerCtlRef.current = instance;
        // instance.run(url, source, exit)
        var canvas = canvasRef.current;
        var ctx = canvasRef.current.getContext('2d');
        var video = playerRef.current;

        // set canvas size = video size when known
        video.addEventListener('loadedmetadata', function () {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            video.style.visibility = false;
            console.log("loadedmetadata")
        });

        video.addEventListener('play', function () {
            
            (function loop() {
                if (!video.paused && !video.ended) {
                    console.log('cavas draw...')
                    ctx.drawImage(video, 0, 0);
                    setTimeout(loop, 1000 / 30); // drawing at 30fps
                }
            })();
            console.log('play');
        });

    }, [])

    // Dispose
    React.useEffect(() => {
        return () => {
            playerRef.current = null;
            playerCtlRef.current = null;
        };
    }, [playerRef]);

    return (
        // <video
        //     ref={playerRef}
        //     controls={true}
        //     className="video"
        //     muted
        // ></video>
        <div id="theater">
            <video id="video" style={{width:"200px"}} controls={true} autoPlay={true} ref={playerRef} src="http://file.ioliz.com/admin/video/Samsung.mp4"></video>
            <canvas id="canvas"  style={{left:"300px", position:"absolute", width:"200px", height:"200px"}}ref={canvasRef}></canvas>
            <label>
                <br />Try to play me </label>
            <br />
        </div>
    );
}