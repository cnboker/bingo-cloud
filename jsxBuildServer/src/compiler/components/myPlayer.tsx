import React, { useEffect, useRef } from "react";
import { useState } from "react";
import { IVideoProps } from "../Meta";
import { IDataSource } from "./Playlist";
import { fetchNext, peek } from "./Viewport";
import MP4Box from "mp4box";
type Range = {
  //总共多少个数据块
  chunks: number;
  index: number;
  chunksSize: number;
  fileSize: number;
  duration: number;
};

export default ({ url, exit, source, label }: IVideoProps & IDataSource) => {
  const playerRef = useRef(null);
  const mediaSourceRef = useRef(null);
  const rangeRef = useRef<Range>(null);
  const playUrlRef = useRef(url);

  function isCanvasSupported() {
    var elem = document.createElement("canvas");
    return !!(elem.getContext && elem.getContext("2d"));
  }

  function timeupdate() {
    const player = playerRef.current;
    //console.log('!fetchNextRef.current',!fetchNextRef.current,player.duration , mediaSourceRef.current.duration)
    //视频总长度，系统会动态更新直到获取到最大播放长度,player.currentTime是当前播放时长
    const playSeekDuration = timeRangesToString(player.seekable);
    console.log(`seektime=${playSeekDuration}, duration=${player.currentTime}`);
    //当前视频播放结束
    if (playSeekDuration - player.currentTime < 1) {
      //播放过的内容释放掉，否则会引起内存泄漏
      const range = rangeRef.current;
      const sourceBuffer = mediaSourceRef.current.sourceBuffers[0];

      //下一位未下载完成，继续下载
      //console.log("end...", range.index, range.chunks);
      if (range.index < range.chunks) {
        sourceBuffer.remove(0 /* start */, (playSeekDuration * 2) / 3 /* end*/);
        console.log("video end, remove sourcebuffer", range.duration);
        //playVideo()
        fetchSegment(playUrlRef.current, true);
      } else {
        player.removeEventListener("timeupdate", timeupdate);
        console.log('exit function', exit)
        //播放完成
        if (exit) {
          exit(label);
        }
      }
    }
  }

  //url 改变重置数据
  useEffect(() => {
    if (isCanvasSupported()) {
      console.log("canvas is  supported");
    } else {
      console.log("canvas is not supported");
    }
    rangeRef.current = {
      index: 0,
      chunks: 0,
      fileSize: 0,
      duration: 0,
      chunksSize: 1024 * 2000,
    };
    mediaSourceRef.current = null;
    //sourceBufferRef.current = null;
    //获取文件尺寸
    getFileLength(url).then((bytes) => {
      const range = rangeRef.current;
      range.fileSize = bytes;
      range.index = 0;
      range.chunks = Math.ceil(bytes / range.chunksSize);
      videomime(playUrlRef.current, (mime) => {
        addVideoBuffer(mime);
      });
    });

    const player = playerRef.current;
    player.addEventListener("timeupdate", timeupdate);
  }, []);

  function playVideo() {
    const player = playerRef.current;
    player.addEventListener("play", () => {}, { once: true });

    player.addEventListener(
      "ended",
      () => {
        //const buffer = sourceBufferRef.current;
        console.log("end!!!!", url);

        //exit && exit("video");
      },
      { once: true }
    );

    var playPromise = player.play();

    if (playPromise !== undefined) {
      playPromise
        .then((_) => {
          // Automatic playback started!
          // Show playing UI.
          console.log("play ok");
        })
        .catch((error) => {
          // Auto-play was prevented
          // Show paused UI.
          console.log("play error", error);
        });
    }
  }

  // Dispose the Video.js player when the functional component unmounts
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

  const getFileLength = async (url): Promise<number> => {
    return new Promise<number>((resolve) => {
      var xhr = new XMLHttpRequest();
      xhr.open("GET", url, true);
      xhr.onreadystatechange = () => {
        resolve(+xhr.getResponseHeader("Content-Length"));
        xhr.abort();
      };
      xhr.send();
    });
  };
  //获取视频mime
  const videomime = async (url, cb) => {
    let blob = await fetch(url).then((r) => r.blob());
    const fileReader = new FileReader();
    fileReader.readAsArrayBuffer(blob);
    fileReader.addEventListener("load", (e) => {
      const buffer = fileReader.result;
      //@ts-ignore
      buffer.fileStart = 0;
      var mp4boxfile = MP4Box.createFile();
      mp4boxfile.onError = console.error;
      mp4boxfile.onReady = function (info) {
        const arr = info.mime.replace("Opus", "opus").split(";");
        arr.pop();
        const mime = arr.join(";");
        console.log(mime, url);
        cb && cb(mime);
      };
      mp4boxfile.appendBuffer(fileReader.result);
      mp4boxfile.flush();
      // TODO: Fetch further segment and append it.
    });
  };

  const addVideoBuffer = (mimeCodec) => {
    const player = playerRef.current;
    player.onerror = function () {
      console.log(
        "Error " + player.error.code + "; details: " + player.error.message
      );
    };
    //const mimeCodec = 'video/mp4; codecs="avc1.42c028"';
    // if (!MediaSource.isTypeSupported('video/webm; codecs="vp8,vorbis"')) {
    //   console.log("video/webm; codecs= vp8,vorbis API is not supported.");
    // }
    if (window.MediaSource && window.MediaSource.isTypeSupported(mimeCodec)) {
      //if (mediaSourceRef.current) return;
      const mediaSource = new MediaSource();
      mediaSourceRef.current = mediaSource;
      player.src = URL.createObjectURL(mediaSource);
      mediaSource.addEventListener(
        "sourceopen",
        () => {
          console.log("create buffer", url);
          URL.revokeObjectURL(player.src);
          const sourceBuffer = mediaSource.addSourceBuffer(mimeCodec);
          //多视频文件无缝播放需要设置该参数
          sourceBuffer.mode = "sequence";

          fetchSegment(playUrlRef.current, true);
        },
        { once: true }
      );
    } else {
      console.log("The Media Source Extensions API is not supported.");
    }
  };

  function timeRangesToString(ranges) {
    var s = "";
    for (var i = 0; i < ranges.length; ++i) {
      s += ranges.end(i).toFixed(3);
    }
    return +s;
  }
  const updateEnd = (e) => {
    const sourceBuffer = mediaSourceRef.current.sourceBuffers[0];
    if (!sourceBuffer) return;
    console.log(
      "updateend",
      sourceBuffer.updating,
      mediaSourceRef.current.readyState,
      url
    );
    //console.log(`seek= ${timeRangesToString(playerRef.current.seekable)}`);
    // if(mediaSourceRef.current.readyState === "ended"){
    //   sourceBuffer.changeType(mimeRef.current)
    // }
    if (
      !sourceBuffer.updating &&
      mediaSourceRef.current.readyState === "open"
    ) {
      const { index, chunks } = rangeRef.current;

      if (index === 1) {
        playVideo();
      }
      // console.log(`updateEnd!!! index=${index}, url=${urlState}, chunks=${chunks}`);
      if (index < chunks) {
        fetchSegment(playUrlRef.current, true);
      } else {
        //fetchNextRef.current = false;
        //mediaSourceRef.current.endOfStream();
        //如果当前视频播放完成，检查下一个内容是否是视频，如果是视频先缓冲一段到缓冲区， 等到当前结束后可以继续下载，继续播放
        tryCacheNext();
      }
    }
  };

  const tryCacheNext = () => {
    let nextProps: IVideoProps = peek(source);
    if (nextProps.type !== "video") return;
    nextProps = fetchNext(source);
    playUrlRef.current = nextProps.url;

    getFileLength(nextProps.url).then((bytes) => {
      const range = rangeRef.current;
      range.fileSize = bytes;
      range.index = 0;
      range.duration = timeRangesToString(playerRef.current.seekable);
      range.chunks = Math.ceil(bytes / range.chunksSize);
      videomime(playUrlRef.current, (code) => {
        const sourceBuffer = mediaSourceRef.current.sourceBuffers[0];
        //Change Audio Codecs
        sourceBuffer.changeType(code);
        fetchSegment(playUrlRef.current, false);
      });
    });
  };

  const fetchSegment = (_url: string, continueFetch: boolean) => {
    const range = rangeRef.current;
    const { chunksSize, index, fileSize } = range;
    const sourceBuffer = mediaSourceRef.current.sourceBuffers[0];
    const startByte = chunksSize * index;
    let endByte = startByte + chunksSize - 1;
    if (endByte > fileSize) {
      endByte = fileSize - 1;
    }

    console.log(
      "range",
      `bytes=${startByte}-${endByte}`,
      range.index,
      _url,
      fileSize
    );
    range.index++;
    fetch(_url, {
      headers: { range: `bytes=${startByte}-${endByte}` },
    })
      .then((response) => response.arrayBuffer())
      .then((data) => {
        if (continueFetch) {
          sourceBuffer.addEventListener("updateend", updateEnd, {
            once: true,
          });
        }
        sourceBuffer.appendBuffer(data);
      });
  };

  return <video ref={playerRef} muted className="video" ></video>;
};
