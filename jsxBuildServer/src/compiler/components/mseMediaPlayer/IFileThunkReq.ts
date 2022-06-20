export type Segment = {
  //总共多少个数据块
  chunkCount: number;
  //当前下载数据块
  chunks?: ArrayBuffer;
  index: number;

  //文件大小
  fileSize: number;
};

export interface IVideoThunkReq {
  segment: Segment;
  begin(url: string): Promise<ArrayBuffer>;
  next(): Promise<ArrayBuffer>;
}
const chunkSize = 1024 * 2000;
export class VideoThunkReq implements IVideoThunkReq {
  segment: Segment;
  url: string;

  async begin(url: string): Promise<ArrayBuffer> {
    this.url = url;
    const fileSize = await this.getFileLength(url);
    //console.log('fileSize',fileSize)
    this.segment = {
      fileSize: fileSize,
      index: 0,
      chunks: null,
      chunkCount: Math.ceil(fileSize / chunkSize),
    };
    
    return this.next();
  }

  next(): Promise<ArrayBuffer> {
    const { index, fileSize } = this.segment;
    const startByte = chunkSize * index;
    let endByte = startByte + chunkSize - 1;
    if (endByte > fileSize) {
      endByte = fileSize - 1;
    }
    return new Promise((resolve, reject) => {
      fetch(this.url, {
        headers: { range: `bytes=${startByte}-${endByte}` },
      })
        .then((response) => response.arrayBuffer())
        .then(async (data) => {
         
          this.segment.chunks = data;
          this.segment.index += 1;
          resolve(data);
          console.log('fetch data',this.url, this.segment)
        })
        .catch((e) => {
          reject(e);
        });
    });
  }

  async getFileLength(url: string): Promise<number> {
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
  }
}
