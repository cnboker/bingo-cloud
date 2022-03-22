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
  //console.log('autoplay-----', autoPlay, url)
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
  }, [url]);

  async function playVideo() {
    const player = playerRef.current;
    player.addEventListener(
      "play",
      () => {
        console.log("playing");
        player.classList.remove("video-hidden");
        player.classList.add("video");
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

  useEffect(() => {
    const player = playerRef.current;
    //@ts-ignore
    if (autoPlay) {
      //这里不能用 player.on, 因为再循环播放的时候会出现播放结束url不对的情况
      //@ts-ignore
      player.addEventListener(
        "ended",
        () => {
          playerRef.current.classList.add("video-hidden");
          const buffer = sourceBufferRef.current;
          console.log("end!!!!", url);
          exit && exit(label);
        },
        { once: true }
      );
      playVideo();

      const { index, chunks } = rangeRef.current;
      console.log(`play!!! autoplay=${autoPlay}, index=${index}, url=${url}`);
      if (index === 1) {
        fetchSegment();
        //playVideo();
      }
    }
  }, [autoPlay]);

  // Dispose the Video.js player when the functional component unmounts
  React.useEffect(() => {
    const player = playerRef.current;
    return () => {
      if (player) {
        // player.dispose();
        playerRef.current = null;
        // mediaSourceRef.current = null;
        // sourceBufferRef.current = null;
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
          fetchSegment();
        },
        { once: true }
      );
    } else {
      console.log("The Media Source Extensions API is not supported.");
    }
  };

  // const readToEnd = () => {
  //   const timer = setInterval(() => {
  //     const { index, chunks } = rangeRef.current;
  //     if (index < chunks) {
  //       fetchSegment();
  //     } else {
  //       clearInterval(timer);
  //       mediaSourceRef.current.endOfStream();
  //     }
  //   }, 200);
  // };

  const updateEnd = (e) => {
    console.log(
      "updateend",
      sourceBufferRef.current.updating,
      mediaSourceRef.current.readyState,
      url
    );

    if (
      !sourceBufferRef.current.updating &&
      mediaSourceRef.current.readyState === "open"
    ) {
      const { index, chunks } = rangeRef.current;

      // if (autoPlay && index === 1) {
      //   playVideo();
      //   readToEnd();
      // }
      console.log(
        `updateEnd!!! autoplay=${autoPlay}, index=${index}, url=${url}, chunks=${chunks}`
      );
      if (index < chunks && autoPlay) {
        fetchSegment();
      } else {
        mediaSourceRef.current.endOfStream();
      }
    }
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

        sourceBufferRef.current.addEventListener("updateend", updateEnd, {
          once: true,
        });
        sourceBuffer.appendBuffer(data);

        // TODO: Fetch further segment and append it.
      });
  };

  return (
    <video
      ref={playerRef}
      muted
      className="video-hidden"
      autoPlay={autoPlay}
    ></video>
  );
};
