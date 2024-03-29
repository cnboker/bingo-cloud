export interface ISouceBuffer2 {
  //通过mediasource 添加sourceBuffer
  addSourceBuffer(mimeCodec: string, mode: "sequence" | "segments");
  appendBuffer(chunk: ArrayBuffer);
  //添加数据完成，如果继续添加等待该事件触发
  //updateEnd: () => void;
  clear(end: number);
}

export class SourceBuffer2 implements ISouceBuffer2 {
  mediaSource: MediaSource;
  sourceBuffer: SourceBuffer;
  bufferCache: ArrayBuffer[];
  lastTirmEnd:number;
  //是否已经启动定时添加缓存
  timerBufferCacheEnabled: boolean;
  get updating(): boolean {
    return this.sourceBuffer.updating;
  }
  constructor(mediaSource: MediaSource) {
    this.mediaSource = mediaSource;
    this.bufferCache = [];
    this.lastTirmEnd = 0;
  }
  clear(end: number) {
    if (!this.sourceBuffer.updating) {
      
      this.sourceBuffer.remove(this.lastTirmEnd, end);
      this.lastTirmEnd = end;
      console.log("video end, remove sourcebuffer", end);
    } else {
      //this.sourceBuffer.abort();
    }
  }

  async addSourceBuffer(
    mimeCodec: string,
    mode: "sequence" | "segments"
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (window.MediaSource && window.MediaSource.isTypeSupported(mimeCodec)) {
        if (this.sourceBuffer) {
          //this.sourceBuffer.changeType(mimeCodec);
          resolve();
          return;
        }

        const getSourceBuffer = () => {
          try {
            const sourceBuffer = this.mediaSource.addSourceBuffer(mimeCodec);

            //多视频文件无缝播放需要设置该参数
            sourceBuffer.mode = mode;
            return sourceBuffer;
          } catch (e) {
            throw e;
          }
        };
        if (this.mediaSource.readyState === "open") {
          this.sourceBuffer = getSourceBuffer();
          resolve();
        } else {
          this.mediaSource.addEventListener(
            "sourceopen",
            () => {
              this.sourceBuffer = getSourceBuffer();
              //console.log("sourcebuffer", this.sourceBuffer);
              resolve();
            },
            { once: true }
          );
        }
      } else {
        reject("The Media Source Extensions API is not supported.");
      }
    });
  }

  appendBuffer(chunk: ArrayBuffer) {
    this.bufferCache.push(chunk);
    if (!this.timerBufferCacheEnabled) {
      this.timerBufferCacheEnabled = true;
      setInterval(async () => {
        await this.timerAppendBuffer();
      }, 500);
    }
  }

  timerAppendBuffer() {
    if (!this.bufferCache[0]) {
      return Promise.resolve();
    }
    return new Promise<void>((resolve, reject) => {
      if (!this.sourceBuffer) {
        reject(
          "appendBuffer is not null, please call addSourceBuffer before run it"
        );
        return;
      }
      this.sourceBuffer.addEventListener(
        "updateend",
        () => {
          resolve();
          console.log('addsourcebuffer append success!-----')
        },
        { once: true }
      );
      try {
        if(this.sourceBuffer.updating){
          return Promise.resolve();
        }
        this.sourceBuffer.appendBuffer(this.bufferCache[0]);
        this.bufferCache.shift();
        
      } catch (e) {
        reject(e);
      }
    });
  }
}
