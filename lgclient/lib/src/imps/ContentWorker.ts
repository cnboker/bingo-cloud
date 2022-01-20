import {
  IContentWorker,
  IContentNotify,
  IResourceInfo,
  IFileDownloader
} from "../interfaces/IContentWorker";
import { readFile } from "./WebOSFileService";
import { getService } from "./ServiceProiver";
import { IMQTTDispatcher } from "../interfaces/IMQTTDispatcher";
import { APP_DIR, instance,isInTest } from "../configer";
export default class ContentWorker implements IContentWorker {
  contentNotify: IContentNotify;
  fileDownloader: IFileDownloader;
  mqttDispather: IMQTTDispatcher;

  //callback defined
  execute(cb: { (): void }): void {
    this.contentNotify = <IContentNotify>getService("IContentNotify");
    this.fileDownloader = <IFileDownloader>getService("IFileDownloader");
    this.mqttDispather = <IMQTTDispatcher>getService("IMQTTDispatcher");
    if(!isInTest){
      this.mqttDispather.connect(instance.mqttServer,instance.deviceId);
    }
    this.mqttDispather.onSubContentNotify = (data) => {
      //fileServer:http://ip:port/scott
      //发布目录/dist/index.html
      var fileList = data.files.map(x => <IResourceInfo>{
        resourceUrl: `${x}`,
        status: 0
      });
      this.download(fileList, cb)
    }
  
    //如果上次下载未完成，读未下载数据继续下载
    readFile(`${APP_DIR}/downloadlist.json`)
      .then(text => JSON.parse(text))
      .then(fileList => {
        this.download(fileList, cb)
      }).catch(e => {
        console.log("read downloadlist.json", e);
      });

    this.contentNotify.watch();
  }
  //

  download(fileList: IResourceInfo[], cb: { (): void }) {
    if (fileList.length > 0) {
      if (this.fileDownloader) {
        this.fileDownloader.cancel();
      }
      this.fileDownloader.onDownloadComplete = (fileList:IResourceInfo[])=>{
        this.diskClean(fileList);
        if (cb) { cb(); }
      }
      this.fileDownloader.download(fileList);
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
