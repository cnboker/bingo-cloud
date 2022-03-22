import {
  DownloadStatus,
  IFileDownloader,
  IResourceInfo
} from "../interfaces/IContentWorker";
import { APP_DIR, APP_DOWNLOAD_DIR, instance } from "../configer";
import { writeFile, exists, removeFile } from './WebOSFileService'
import { download, downloadStatusQuery } from '../webosApis/downloadManager'
import { IMQTTDispatcher } from "../interfaces/IMQTTDispatcher";
import { getService } from "./ServiceProiver";

type FileInfo = {
  dir: string
  fileName: string,
  fullFileName: string
}
export class FileDownloader implements IFileDownloader {
  fileList: IResourceInfo[];

  onDownloadComplete: (fileList: IResourceInfo[]) => void;
  onOneDownloadComplete: (file: IResourceInfo) => void;

  constructor() {
    this.onOneDownloadComplete = async (res: IResourceInfo) => {
      const downloadList = this.fileList.filter(x => x.status === DownloadStatus.Origin || x.status === undefined)
      const jsonContent = JSON.stringify(downloadList)
      // console.log('this.fileList', jsonContent)
      // try {
      //   await writeFile(`${APP_DIR}/downloadlist.json`, jsonContent);
      // } catch (err) {
      //   console.log("write downlaodList.json error", err);
      //   //return;
      // }
      if (downloadList.length > 0) {
        this.singleFileDownload(downloadList[0])
      } else{
        if(!this.fileList.find(x=>x.status === DownloadStatus.Origin)){
          console.log('download complete', this.fileList)
          this.onDownloadComplete(this.fileList);
        }
      }
    }

  }
  cancel(): void {
    this.fileList = [];
    //取消正在下载的文件
    //待处理
  }

  download(fileList: IResourceInfo[]): void {
    this.fileList = fileList;
    if (fileList.length > 0) {
      this.singleFileDownload(fileList[0])
    }else{
      this.onDownloadComplete(fileList);
    }
    this.checkDownloadStatus();
  }


  //获取下载文件存储目录
  //js,html,css文件需要存储在根目录
  private getDownloadFileInfo(targetUrl: string): FileInfo {
    const url = new URL(targetUrl);
    let dir = `${APP_DOWNLOAD_DIR}${url.pathname.substr(0, url.pathname.lastIndexOf('/'))}`
    const fileName = url.pathname.split('/').pop() || ''
    if (['.js', '.css', '.html', '.htm'].indexOf(fileName.substr(fileName.lastIndexOf('.'))) > -1) {
      dir = APP_DOWNLOAD_DIR
    }
    return <FileInfo>{
      dir,
      fileName,
      fullFileName: `${dir}/${fileName}`
    }
  }

  //默认下载路径为/media/internal/downloads/filename 
  //为了实现下载目录包含自定义路径需要自行设置target属性
  //检查.html .css .js文件是否存在，存在则删除重新下载
  private async canDownload(res: IResourceInfo): Promise<boolean> {
    //https://dmitripavlutin.com/parse-url-javascript/
    const { resourceUrl: target } = res
    const { dir, fileName, fullFileName } = this.getDownloadFileInfo(target)

    //目标文件已下载，且格式是.html,.htm,.css,.js则删除重新下载
    const exist = await exists(fullFileName)
    console.log('exist', exist, fullFileName)
    if (exist) {
      const ext = fileName.substring(fileName.lastIndexOf('.'))
      if (['.js', '.css', '.html', '.htm'].indexOf(ext) > -1) {
        console.log('remove file', fullFileName, ext)
        try {
          await removeFile(fullFileName)
        } catch (e) {
          console.log('remove file err', e)
        }
      } else {
        res.status = DownloadStatus.Success
        return false
      }
    }
    else {
      return true
    }
    return true
  }

  private checkDownloadStatus() {
    const mqttDispather = <IMQTTDispatcher>getService("IMQTTDispatcher");
    const timer = setInterval(() => {
      const downloadList = this.fileList.filter(x => x.status == DownloadStatus.Begin)
      const pendingList = this.fileList.filter(x => x.status === DownloadStatus.Origin || x.status === undefined)
      if (pendingList.length === 0) {
        console.log('clearInterval...')
        clearInterval(timer)
      }
      for (const item of downloadList) {
        downloadStatusQuery(item.ticket).then(result => {
          const { completed } = result;
          mqttDispather.pubDownloadProgress(result)
          if (completed) {
            item.status = DownloadStatus.Success
            this.onOneDownloadComplete(item)
            console.log('downloadStatusQuery finished', item)
          }
        })
      }
    }, 1000);
  }

  private async singleFileDownload(resource: IResourceInfo): Promise<void> {
    resource.status = DownloadStatus.Origin;

    const { dir, fileName } = this.getDownloadFileInfo(resource.resourceUrl)
    const canDownload = await this.canDownload(resource)
    //console.log("begin download", resource.resourceUrl);

    if (!canDownload) {
      this.onOneDownloadComplete(resource)
      return;
    }
    //console.log("begin download", dir, fileName, fullFileName, resource.resourceUrl);
    download(
      resource.resourceUrl,
      dir,
      fileName,
      instance.token,
    ).then(ticket => {
      resource.ticket = ticket;
      resource.status = DownloadStatus.Begin
    })
      .catch(e => {
        console.log("singleFileDownload error", e);
        resource.status = DownloadStatus.Failure;
        this.onOneDownloadComplete(resource)
      })
  }
}
