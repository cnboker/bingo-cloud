import {
  IFileDownloader,
  IResourceInfo
} from "../interfaces/IContentWorker";
import { instance } from "../configer";
import { writeFile } from './WebOSFileService'
import { download } from '../webosApis/downloadManager'
import { IMQTTDispatcher } from "../interfaces/IMQTTDispatcher";
import { getService } from "./ServiceProiver";

export class FileDownloader implements IFileDownloader {
  fileList: IResourceInfo[];

  onDownloadComplete: (fileList: IResourceInfo[]) => void;
  onOneDownloadComplete: (file: IResourceInfo) => void;

  cancel(): void {
    this.fileList = [];
    //取消正在下载的文件
    //待处理
  }

  download(fileList: IResourceInfo[]): void {
    this.fileList = fileList;
    var result: IResourceInfo[] = [];

    this.onOneDownloadComplete = (res: IResourceInfo) => {
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
        //this.dispatcher.dispatch(DOWNLAOD_COMPLETE_EVENT, result);
        this.onDownloadComplete(this.fileList);
      }
    }
    //download first file
    if (this.fileList.length > 0) {
      this.singleFileDownload(this.fileList[0]);
    } else {
      //this.dispatcher.dispatch(DOWNLAOD_COMPLETE_EVENT,this.fileList);
      this.onDownloadComplete(this.fileList)
    }
  }

  private singleFileDownload(resource: IResourceInfo): void {
    console.log("begin download", resource.resourceUrl);
    resource.status = 3;
    var apiUrl = `${instance.fileServer}${resource.resourceUrl}`;
    const mqttDispather = <IMQTTDispatcher>getService("IMQTTDispatcher");
    download(
      apiUrl,
      resource.resourceUrl,
      percentResult => {
        console.log("download result:", JSON.stringify(percentResult));
        mqttDispather.pubDownloadProgress(percentResult)
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
        this.onOneDownloadComplete(resource)
      });
  }


}
