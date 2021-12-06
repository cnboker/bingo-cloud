import { ContentPackage } from "../dataModels/ContentPackage";
import {
  IContentWorker,
  IContentNotify,
  IResourceInfo,
  IFileDownloader
} from "../interfaces/IContentWorker";
import { FileDownloader } from "./FileDownloader";
import { readFile } from './WebOSFileService'
import { getService } from "./ServiceProiver";

export default class ContentWorker implements IContentWorker {
 
  contentNotify: IContentNotify;
  fileDownloader: IFileDownloader;

  constructor() {
    this.contentNotify = getService<IContentNotify>();
    this.fileDownloader = getService<IFileDownloader>();
  }

  //callback defined
  execute(cb: { (): void }): void {
    this.contentNotify.onContentReady((data: ContentPackage) => {
      var fileList = data.files.map(x => <IResourceInfo>{
        resourceUrl: x,
        status: 0
      });
      this.download(fileList, cb)
    });
    //如果上次下载未完成，读未下载数据继续下载
    readFile('downloadlist.json')
      .then(text => JSON.parse(text))
      .then(fileList => {
        this.download(fileList, cb)
      }).catch(e => {
        console.log("read package.json", e);
      });

    this.contentNotify.watch();
  }
  //

  download(fileList: IResourceInfo[], cb: { (): void }) {
    if (fileList.length > 0) {
      if (this.fileDownloader) {
        this.fileDownloader.cancel();
      }
      this.fileDownloader = new FileDownloader(fileList);
      this.fileDownloader
        .onDownloadComplete(() => {
          this.diskClean(fileList);
          if (cb) { cb(); }
        });
      this.fileDownloader.download();
    }
  }

  diskClean(data: IResourceInfo[]) {
    //const ONE_HOUR = 3600 * 1000;
    // var timer = setTimeout(() => {
    //   clearTimeout(timer);
    //   var clear = new DiskClear(data);
    //   clear.clean();
    // }, 6000);
  }
}
