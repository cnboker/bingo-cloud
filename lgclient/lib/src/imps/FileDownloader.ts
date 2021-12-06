import {
  IFileDownloader,
  IResourceInfo
} from "../interfaces/IContentWorker";
import { instance } from "../configer";
import { SINGLE_FILE_DOWNLOAD_COMPLETE_EVENT, DOWNLAOD_COMPLETE_EVENT } from '../constants'
import EventDispatcher from "./EventDispatcher";
import { writeFile } from './WebOSFileService'
import { download } from '../webosApis/downloadManager'
import { mqttConnect, mqttDownloadProgressPublish } from "./MQTTDispatcher";

export class FileDownloader implements IFileDownloader {
  fileList: IResourceInfo[];
  private dispatcher: EventDispatcher;

  constructor(fileList: IResourceInfo[]) {
    this.dispatcher = new EventDispatcher();
    //过滤代下载资源
    this.fileList = fileList.filter(x => x.status === 0);;
    mqttConnect(instance.mqttServer)
  }

  onDownloadComplete(callback: (fileList: IResourceInfo[]) => void): void {
    this.dispatcher.subscribe(DOWNLAOD_COMPLETE_EVENT, callback)
  }

  cancel(): void {
    this.fileList = [];
    //取消正在下载的文件
    //待处理
  }

  download(): void {
    var result: IResourceInfo[] = [];
    this.onSingleDownloadComplete((res: IResourceInfo) => {
      //console.log("file download completed", res);
      result.push(res);
      this.fileList = this.fileList.filter(x => {
        return x.resourceUrl != res.resourceUrl;
      });
      writeFile("downloadlist.json", JSON.stringify(this.fileList))
        .then(err => {
          if (err) {
            console.log("write package.json error", err);
            return;
          }
        });
      if (this.fileList.length > 0) {
        this.singleFileDownload(this.fileList[0]);
      } else {
        this.dispatcher.dispatch(DOWNLAOD_COMPLETE_EVENT, result);
      }
    });
    //download first file
    if (this.fileList.length > 0) {
      this.singleFileDownload(this.fileList[0]);
    } else {
      this.dispatcher.dispatch(DOWNLAOD_COMPLETE_EVENT,this.fileList);
    }
  }
  private onSingleDownloadComplete(callback: (file: IResourceInfo) => void): void {
    this.dispatcher.subscribe(SINGLE_FILE_DOWNLOAD_COMPLETE_EVENT, callback)
  }
  
  private singleFileDownload(resource: IResourceInfo): void {
    console.log("begin download", resource.resourceUrl);
    resource.status = 3;
    var apiUrl = `${instance.fileServer}${resource.resourceUrl}`;

    download(
      apiUrl,
      resource.resourceUrl,
      percentResult => {
        console.log("download result:", JSON.stringify(percentResult));
        mqttDownloadProgressPublish(instance.deviceId, percentResult)
      }
    )
      .then(() => {
        resource.status = 1;
        return resource;
      })
      .catch(e => {
        console.log("singleFileDownload error", e);
        resource.status = 2;
        return resource;
      })
      .then(resource => {
        console.log("singleDispatcher execute");
        this.dispatcher.dispatch(SINGLE_FILE_DOWNLOAD_COMPLETE_EVENT, resource);
      });
  }


}
