import React, { useEffect, useRef } from "react";

type Range = {
  //总共多少个数据块
  chunks: number;
  index: number;
  chunksSize: number;
  fileSize: number;
};

export default ({ autoPlay, url, exit, label }) => {
  const playerRef = useRef(null);
  const sourceBufferRef = useRef(null);
  const mediaSourceRef = useRef(null);
  const rangeRef = useRef<Range>(null);
  rangeRef.current = {
    index: 0,
    chunks: 0,
    fileSize: 0,
    chunksSize: 1024 * 2000,
  };

  useEffect(() => {
     //获取文件尺寸
     getFileLength(url).then((bytes) => {
      const range = rangeRef.current;
      range.fileSize = bytes;
      range.chunks = Math.ceil(bytes / range.chunksSize);
      addVideoBuffer();
    });
  }, []);

  async function playVideo() {
    const player = playerRef.current;
    player.addEventListener(
      "play",
      () => {
        console.log("playing");
        player.classList.remove("video-hidden");
        player.classList.add("video");
        // var timer = setInterval(() => {
        //   const { index, chunks } = rangeRef.current;
        //   //console.log("index", index);
        //   if (index >= chunks - 1) {
        //     clearInterval(timer);
        //   }
        //   fetchSegment();
        // }, 500);
      },
      { once: true }
    );
    // Show loading animation.

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

  useEffect(() => {
    //console.log("autoPlay", autoPlay);
    const player = playerRef.current;
    if (!player) return;
    //@ts-ignore
    if (autoPlay) {
     
      //这里不能用 player.on, 因为再循环播放的时候会出现播放结束url不对的情况
      //@ts-ignore
      player.addEventListener(
        "ended",
        () => {
          playerRef.current.classList.add("video-hidden");
          playerRef.current.load();
          console.log("end!!!!", url);
          exit && exit(label);
        },
        { once: true }
      );

      console.log("play!!!", url);

      //playVideo();
    }
  }, [autoPlay]);

  // Dispose the Video.js player when the functional component unmounts
  React.useEffect(() => {
    const player = playerRef.current;
    return () => {
      if (player) {
        // player.dispose();
        playerRef.current = null;
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
    if(!MediaSource.isTypeSupported('video/webm; codecs="vp8,vorbis"')){
      console.log('video/webm; codecs= vp8,vorbis API is not supported.')
    }
    if (window.MediaSource && window.MediaSource.isTypeSupported(mimeCodec)) {
      const mediaSource = new MediaSource();
      mediaSourceRef.current = mediaSource;
      player.src = URL.createObjectURL(mediaSource);
      mediaSource.addEventListener(
        "sourceopen",
        () => {
          URL.revokeObjectURL(player.src);
          const sourceBuffer = mediaSource.addSourceBuffer(mimeCodec);
          sourceBuffer.addEventListener("updateend", updateEnd);
          sourceBufferRef.current = sourceBuffer;
          //console.log("soruceopen....", url);
          // Fetch beginning of the video by setting the Range HTTP request header.
          fetchSegment();
        }
      );
      
    } else {
      console.log("The Media Source Extensions API is not supported.");
    }
  };

  const updateEnd = (e) => {
    // Video is now ready to play!
    // const bufferedSeconds = playerRef.current.buffered.end(0) - playerRef.current.buffered.start(0);
   // console.log(`${bufferedSeconds} seconds of video are ready to play.`);
    // Fetch the next segment of video when user starts playing the video.
    // loopFetch();
    if (
      !sourceBufferRef.current.updating &&
      mediaSourceRef.current.readyState === "open"
    ) {
      
      const { index, chunks } = rangeRef.current;
      console.log('autoplay', autoPlay, index, chunks)
      if (autoPlay && index === 1) {
        playVideo();
      }
      
      if (index < chunks && autoPlay) {
        fetchSegment();
       //mediaSourceRef.current.endOfStream();
      }else{
        mediaSourceRef.current.endOfStream();
      }
    }
    //const { index } = rangeRef.current;
    //console.log("updateEnd ...", index);
  };

  const fetchSegment = () => {
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
      url,
      fileSize
    );
    range.index++;
    fetch(url, {
      headers: { range: `bytes=${startByte}-${endByte}` },
    })
      .then((response) => response.arrayBuffer())
      .then((data) => {
        const sourceBuffer = sourceBufferRef.current;

        sourceBuffer.appendBuffer(data);

        // TODO: Fetch further segment and append it.
      });
  };

  return (
    <video ref={playerRef} muted className="video-hidden" controls></video>
  );
};
