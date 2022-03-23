import React, { useEffect, useRef } from "react";
import { useState } from "react";
import { IVideoProps } from "../Meta";
import { IDataSource } from "./SeamlessPlayer";
import { fetchNext, peek } from "./Viewport";

type Range = {
  //总共多少个数据块
  chunks: number;
  index: number;
  chunksSize: number;
  fileSize: number;
};

export default ({ url, exit, source }: IVideoProps & IDataSource) => {
  const playerRef = useRef(null);
  const sourceBufferRef = useRef(null);
  const mediaSourceRef = useRef(null);
  const rangeRef = useRef<Range>(null);
  //const [urlState, setUrlState] = useState(url);
  const playUrlRef = useRef(url)
  const fetchNextRef = useRef(false)
  //url 改变重置数据
  useEffect(() => {
    rangeRef.current = {
      index: 0,
      chunks: 0,
      fileSize: 0,
      chunksSize: 1024 * 2000,
    };
    mediaSourceRef.current = null;
    sourceBufferRef.current = null;
    //获取文件尺寸
    getFileLength(url).then((bytes) => {
      const range = rangeRef.current;
      range.fileSize = bytes;
      range.index = 0;
      range.chunks = Math.ceil(bytes / range.chunksSize);
      addVideoBuffer();
    });
    
    const player = playerRef.current;
    player.addEventListener("timeupdate", () => {
      //console.log('!fetchNextRef.current',!fetchNextRef.current,player.duration , mediaSourceRef.current.duration)
      //视频总长度，系统会动态更新直到获取到最大播放长度,player.currentTime是当前播放时长
      const playSeekDuration = timeRangesToString(player.seekable)
      console.log(`seektime=${playSeekDuration}, duration=${player.currentTime}`)
      //播放到快2秒就要结束时，追加下一个视频数据
      if (playSeekDuration > 2 && playSeekDuration - player.currentTime < 2 && !fetchNextRef.current) {
        //播放过的内容释放掉，否则会引起内存泄漏
        sourceBufferRef.current.remove(0 /* start */, player.currentTime /* end*/);
       // mediaSourceRef.current.duration = 0;
        fetchNextRef.current = true
        let nextProps: IVideoProps = peek(source);
        if (nextProps.type === "video") {
          nextProps = fetchNext(source);
          playUrlRef.current = nextProps.url
          getFileLength(nextProps.url).then((bytes) => {
            const range = rangeRef.current;
            range.fileSize = bytes;
            range.index = 0;
            range.chunks = Math.ceil(bytes / range.chunksSize);
            fetchSegment(playUrlRef.current);
          });
          console.log('setURlstate.....')
        }
      }
    });

  }, []);

  async function playVideo() {
    const player = playerRef.current;
    player.addEventListener("play", () => {}, { once: true });
  
    player.addEventListener(
      "ended",
      () => {
        const buffer = sourceBufferRef.current;
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
        sourceBufferRef.current = null;
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

  const addVideoBuffer = () => {
    const player = playerRef.current;
    const mimeCodec = 'video/mp4; codecs="avc1.640032,mp4a.40.2"';
    if (!MediaSource.isTypeSupported('video/webm; codecs="vp8,vorbis"')) {
      console.log("video/webm; codecs= vp8,vorbis API is not supported.");
    }
    if (window.MediaSource && window.MediaSource.isTypeSupported(mimeCodec)) {
      if (mediaSourceRef.current) return;
      const mediaSource = new MediaSource();
      mediaSourceRef.current = mediaSource;
      player.src = URL.createObjectURL(mediaSource);
      mediaSource.addEventListener(
        "sourceopen",
        () => {
          console.log("create buffer", url);
          URL.revokeObjectURL(player.src);
          sourceBufferRef.current = mediaSource.addSourceBuffer(mimeCodec);
          //多视频文件无缝播放需要设置该参数
          sourceBufferRef.current.mode = 'sequence';
          fetchSegment(playUrlRef.current);
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
      s += ranges.end(i).toFixed(3) 
    }
    return +s ;
  }
  const updateEnd = (e) => {
    // console.log(
    //   "updateend",
    //   sourceBufferRef.current.updating,
    //   mediaSourceRef.current.readyState,
    //   url
    // );
    console.log(`seek= ${timeRangesToString(playerRef.current.seekable)}`);
    if (
      !sourceBufferRef.current.updating &&
      mediaSourceRef.current.readyState === "open"
    ) {
      const { index, chunks } = rangeRef.current;

      if (index === 1) {
        playVideo();
      }
     // console.log(`updateEnd!!! index=${index}, url=${urlState}, chunks=${chunks}`);
      if (index < chunks) {
        fetchSegment(playUrlRef.current);
      } else {
        fetchNextRef.current = false;
        //mediaSourceRef.current.endOfStream();
      }
    }
  };

  const fetchSegment = (_url: string) => {
    const range = rangeRef.current;
    const { chunksSize, index, fileSize } = range;

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
        const sourceBuffer = sourceBufferRef.current;

        sourceBufferRef.current.addEventListener("updateend", updateEnd, {
          once: true,
        });
        sourceBuffer.appendBuffer(data);

        // TODO: Fetch further segment and append it.
      });
  };

  return <video ref={playerRef} muted className="video" controls></video>;
};
