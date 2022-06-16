import { useState } from "react";

export type Segment = {
  //总共多少个数据块
  chunkCount: number;
  //当前下载数据块
  chunks?: ArrayBuffer[];
  index: number;
  chunksSize: number;
  fileSize: number;
  duration: number;
};

export const useFetchThunk = (
): [Segment, (url: string) => void, (url: string) => void] => {
  const [segment, setSegment] = useState<Segment>({
    index: 0,
    chunkCount: 0,
    fileSize: 0,
    duration: 0,
    chunksSize: 1024 * 2000,
  });

  const beginFetch = (url: string) => {
   
    getFileLength(url).then((bytes) => {
      setSegment((range) => {
        range.fileSize = bytes;
        range.index = 0;
        range.chunks = [];
        range.chunkCount = Math.ceil(bytes / range.chunksSize);

        return { ...range };
      });
      segmentFetchNext(url);
    });
  };

  const getFileLength = async (url): Promise<number> => {
    return new Promise<number>((resolve) => {
      var xhr = new XMLHttpRequest();
      xhr.open("GET", url, true);
      xhr.onreadystatechange = () => {
        //@ts-ignore
        resolve(+xhr.getResponseHeader("Content-Length"));
        xhr.abort();
      };
      xhr.send();
    });
  };

  const getDuration = (blob): Promise<number> => {
    return new Promise((resolve) => {
      const el = document.createElement("video");
      el.onloadedmetadata = () => {
        resolve(el.duration);
        URL.revokeObjectURL(el.src);
      };
      el.src = URL.createObjectURL(blob);
    });
  };

  const segmentFetchNext = (url) => {
    const { chunksSize, index, fileSize } = segment;
    //const sourceBuffer = mediaSourceRef.current.sourceBuffers[0];
    const startByte = chunksSize * index ;
    let endByte = startByte + chunksSize - 1;
    if (endByte > fileSize) {
      endByte = fileSize - 1;
    }

    fetch(url, {
      headers: { range: `bytes=${startByte}-${endByte}` },
    })
      .then((response) => response.arrayBuffer())
      .then(async (data) => {
        
        let duration = 0;
        //header,video file duration
        if(index === 0){
          const blob = await(await fetch(url)).blob();
          duration = await getDuration(blob);
        }
        
        setSegment((seg) => {
          //@ts-ignore
          seg.chunks.push(data);
          return { ...seg, index: index + 1, duration};
        });
      })
      .catch((e) => {
        console.log("fetchsegment error", e);
      });
  };

  return [segment, beginFetch, segmentFetchNext];
};
