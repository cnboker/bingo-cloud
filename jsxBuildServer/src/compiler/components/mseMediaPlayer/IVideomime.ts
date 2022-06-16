import MP4Box from "mp4box";
//获取视频文件mime
export const mimeFetch = (url:string):Promise<string> => {
  return new Promise(async (resolve) => {
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
        resolve(mime);
      };
      mp4boxfile.appendBuffer(fileReader.result);
      mp4boxfile.flush();
    });

    // TODO: Fetch further segment and append it.
  });
};
