import React, { useEffect, useRef } from "react";
import { IVideoProps } from "../Meta";
import { IDataSource } from "./Playlist";
import { fetchNext, peek } from "./Viewport";
import useVideoMine from "./useVideoMine";
import { useFetchThunk } from "./useFetchThunk";
import { useInterval } from "./useInterval";

export default ({ url, exit, source }: IVideoProps & IDataSource) => {
  const playerRef = useRef(null);
  const mediaSourceRef = useRef(null);
  const sourceBufferRef = useRef(null);
  const playUrlRef = useRef(url);
  const bufferLoading = useRef(false);
  const [mimeFetch] = useVideoMine();
  const [segment, beginFetch, segmentFetchNext] = useFetchThunk();
  const cacheTime = 2;

  const datafetch = () => {
    if (!sourceBufferRef.current) return;
    const player = playerRef.current;
    //视频总长度，系统会动态更新直到获取到最大播放长度,player.currentTime是当前播放时长
    const playSeekDuration = timeRangesToString(player.seekable);

    sourceBufferDataAppend();
    console.log(`seektime=${playSeekDuration}, duration=${player.currentTime}`);
    //当前视频播放结束
    if (playSeekDuration - player.currentTime < cacheTime) {
      //播放过的内容释放掉，否则会引起内存泄漏
      if (
        !sourceBufferRef.current.updating &&
        player.currentTime - cacheTime > 0
      ) {
        sourceBufferRef.current.remove(
          0 /* start */,
          (player.currentTime * 2) / 3 /* end*/
        );
        console.log(
          "video end, remove sourcebuffer",
          player.currentTime - cacheTime
        );
      }

      if (segment.index > 0 && segment.index < segment.chunkCount) {
        //This method can only be called when SourceBuffer.updating equals false.
        segmentFetchNext(playUrlRef.current);
        //console.log("segmentFetch repeatly, thunk index=", segment.index);
      }
    }
    //一个视频播放完成
    if (playSeekDuration > 0 && playSeekDuration - player.currentTime < 1) {
      //播放完成
      const hasNextVideo = nextIsVideo();
      if (!hasNextVideo && exit) {
        exit();
      } else {
        createAndUpdateSourceBuffer();
      }
    }
  };

  useInterval(datafetch, 2000);
  //添加数据到sourcebuffer
  const sourceBufferDataAppend = () => {
    if (!sourceBufferRef.current) return;
    const buffer = sourceBufferRef.current;
    if (bufferLoading.current || segment.chunks.length === 0) return;
    const chunk = segment.chunks[0];

    try {
      bufferLoading.current = true;
      buffer.addEventListener(
        "updateend",
        () => {
          bufferLoading.current = false;
          if (segment.duration > 0) {
            console.log('databuffer updating', buffer.updating)
            // buffer.timestampOffset += buffer.buffered.end(0);;
            console.log("buffer.timestampOffset", buffer.timestampOffset);
          }
        },
        { once: true }
      );
      buffer.appendBuffer(chunk);
      console.log("appendBuffer", segment);
      //最近成功者放弃该数据
      segment.chunks.pop();
    } catch (e) {
      console.log("appendBuffer error", e);
    }
  };

  //mimeFetch->beginFetch->fetchNext->check is end
  useEffect(() => {
    const player = playerRef.current;
    player.onerror = function () {
      console.log(
        "Error " + player.error.code + "; details: " + player.error.message
      );
    };
    const mediaSource = new MediaSource();
    mediaSourceRef.current = mediaSource;
    player.src = URL.createObjectURL(mediaSource);
    //URL.revokeObjectURL(player.src);
    createAndUpdateSourceBuffer();
  }, []);

  const createAndUpdateSourceBuffer = () => {
    console.log("get mime data...");

    mimeFetch(playUrlRef.current).then(async (mime) => {
      if (!sourceBufferRef.current) {
        console.log("create sourcebuffer after mime ready");
        sourceBufferRef.current = await addSouceBufferWhenOpen(
          mediaSourceRef.current,
          mime,
          "segments"
        );
      } else {
        //Change Audio Codecs
        sourceBufferRef.current.changeType(mime);
      }
      beginFetch(playUrlRef.current);
    });
  };

  // Dispose
  React.useEffect(() => {
    const player = playerRef.current;
    return () => {
      if (player) {
        // player.dispose();
        playerRef.current = null;
        mediaSourceRef.current = null;
        //sourceBufferRef.current = null;
      }
    };
  }, [playerRef]);

  const addSouceBufferWhenOpen = (
    mediaSource,
    mimeCodec,
    mode = "segments"
  ) => {
    return new Promise((resolve, reject) => {
      if (window.MediaSource && window.MediaSource.isTypeSupported(mimeCodec)) {
        const getSourceBuffer = () => {
          try {
            const sourceBuffer = mediaSource.addSourceBuffer(mimeCodec);
            //多视频文件无缝播放需要设置该参数
            sourceBuffer.mode = mode;
            resolve(sourceBuffer);
          } catch (e) {
            reject(e);
          }
        };
        if (mediaSource.readyState === "open") {
          getSourceBuffer();
        } else {
          mediaSource.addEventListener(
            "sourceopen",
            () => {
              console.log("create buffer", url);
              getSourceBuffer();
            },
            { once: true }
          );
        }
      } else {
        reject("The Media Source Extensions API is not supported.");
      }
    });
  };

  function timeRangesToString(ranges) {
    var s = "";
    for (var i = 0; i < ranges.length; ++i) {
      s += ranges.end(i).toFixed(3);
    }
    return +s;
  }

  //获取下一个视频文件第一个数据块
  const nextIsVideo = () => {
    let nextProps: IVideoProps = peek(source);
    if (nextProps.type !== "video") return false;
    nextProps = fetchNext(source);
    playUrlRef.current = nextProps.url;
    return true;
  };

  return (
    <video
      ref={playerRef}
      autoPlay={true}
      controls={false}
      className="video"
    ></video>
  );
};
