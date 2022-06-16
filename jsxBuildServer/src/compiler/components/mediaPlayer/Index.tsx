import React, { useEffect, useRef } from "react";
import { IVideoProps } from "src/compiler/Meta";
import { IDataSource } from "../Playlist";
import { PlayerControler } from "./IPlayerController";


export default ({ url, exit, source }: IVideoProps & IDataSource) => {
    const playerRef = useRef(null);
    const playerRef2 = useRef(null);
    const playerCtlRef = useRef(null);

    useEffect(() => {
        const instance = new PlayerControler(playerRef.current, playerRef2.current);
        playerCtlRef.current = instance;
        instance.run(url, source, exit)
    }, [])

    // Dispose
    React.useEffect(() => {

        return () => {
            playerRef.current = null;
            playerRef2.current = null;
            playerCtlRef.current = null;
        };
    }, [playerRef, playerRef2]);

    return (
        <>
            <video
                ref={playerRef}
                className="view"
                muted
            ></video>
            <video
                ref={playerRef2}
                className="view"
                muted
            ></video>
        </>

    );
}