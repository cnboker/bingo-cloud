export interface ISouceBuffer2 {
  //通过mediasource 添加sourceBuffer
  addSourceBuffer(mimeCodec: string, mode: "sequence" | "segments");
  appendBuffer(chunk: ArrayBuffer);
  //添加数据完成，如果继续添加等待该事件触发
  //updateEnd: () => void;
  clear(end:number);
}

export class SourceBuffer2 implements ISouceBuffer2 {
  mediaSource: MediaSource;
  sourceBuffer: SourceBuffer;
  get updating(): boolean {
    return this.sourceBuffer.updating;
  }
  constructor(mediaSource: MediaSource) {
    this.mediaSource = mediaSource;
  }
  clear(end:number) {
    if(!this.sourceBuffer.updating){
      this.sourceBuffer.remove(0,end)
    }else{
      this.sourceBuffer.abort();
    }
  }

  async addSourceBuffer(
    mimeCodec: string,
    mode: "sequence" | "segments"
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (window.MediaSource && window.MediaSource.isTypeSupported(mimeCodec)) {
        if (this.sourceBuffer && !this.sourceBuffer.updating) {
          this.sourceBuffer.changeType(mimeCodec);
          resolve();
          return;
          //this.mediaSource.removeSourceBuffer(this.sourceBuffer)
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

  async appendBuffer(chunk: ArrayBuffer) {
    if (!this.sourceBuffer) {
      throw "appendBuffer is not null, please call addSourceBuffer before run it";
    }
    this.sourceBuffer.addEventListener(
      "updateend",
      () => {
        if (!this.sourceBuffer.updating) {
         // this.updateEnd && this.updateEnd();
        }
      },
      { once: true }
    );
    this.sourceBuffer.appendBuffer(chunk);
  }

 // updateEnd: () => void;
}
