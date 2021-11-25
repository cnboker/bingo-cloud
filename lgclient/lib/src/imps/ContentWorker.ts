import { ContentPackage } from "../dataModels/ContentPackage";
import {
  IContentWorker,
  IContentNotify,
  IResourceInfo
} from "../interfaces/IContentWorker";
import { ResourceDownloader } from "./ResourceDownloader";
import ContentNotify from "./ContentNotify";
import DiskClear from "./DiskClear";
import EventDispatcher from "../EventDispatcher";
import { CONTENT_READY_EVENT,SINGLE_FILE_DOWNLOAD_COMPLETE_EVENT,SNAPSHOT_EVENT } from '../constants'
import {readFile} from './WebOSFileService'
export default class ContentWorker implements IContentWorker {
  contentPackage: ContentPackage;
  contentNotify: IContentNotify;

  constructor(contentNotify?: IContentNotify) {
    this.contentNotify = contentNotify || new ContentNotify(new EventDispatcher());
  }

  get package() {
    return this.contentPackage;
  }

  //callback defined
  execute(cb: { (resource: ContentPackage): void }): void {
    this.contentNotify.dispatcher.subscribe(CONTENT_READY_EVENT, (data: ContentPackage) => {
      console.log("contentNotify", data.name);
      this.contentPackage = data;
     
      var resourceDownloader = new ResourceDownloader(data);
      resourceDownloader
        .dispatcher
        .subscribe(SINGLE_FILE_DOWNLOAD_COMPLETE_EVENT,(res: IResourceInfo[]) => {
           this.diskClean(data);
          cb(data);
        });
      resourceDownloader.download();
    });

    this.contentNotify.dispatcher.subscribe(SNAPSHOT_EVENT, () => {
      console.log("snapshot");
    });

    this.contentNotify.watch();

    //检查package.json是否存在
    readFile("package.json")
      .then(content => {
        var json = JSON.parse(content);
        this.contentPackage = json;
        //this.diskClean(json);
        cb(json);
      })
      .catch(e => {
        console.log("package.json not exsit");
      });
  }
  //

  diskClean(data: ContentPackage) {
    //const ONE_HOUR = 3600 * 1000;
    // var timer = setTimeout(() => {
    //   clearTimeout(timer);
    //   var clear = new DiskClear(data);
    //   clear.clean();
    // }, 6000);
  }
}
