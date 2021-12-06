import { ContentPackage } from "../dataModels/ContentPackage";
import { IResourceInfo } from "../interfaces/IContentWorker";
import {listAllFile,removeFile} from './WebOSFileService'
export default class DiskClear {
  //当前播放的资源包
  fileList: IResourceInfo[];
  constructor(contentPackage: ContentPackage) {
    this.fileList = contentPackage.files.map(x=>{
      return <IResourceInfo>{
        resourceUrl:x,
      }
    });
  }

  async clean(): Promise<void> {
    await this.clearOldResource(this.fileList).then(() => console.log("clear files ok"));
  }

  private async clearOldResource(result: IResourceInfo[]): Promise<void> {
    if (result.length === 0) return;
    var outFiles: string[] = [];
    //get all files
    await listAllFile("/UploadFiles", outFiles);
    console.log("allfiles", JSON.stringify(outFiles));
    //exclude files
    const removeFiles = outFiles.filter(function(x) {
      return result.map(e => e.resourceUrl).indexOf(x) < 0;
    });
    //remove
    console.log("remove old files",removeFiles);
    for (var file of removeFiles) {
      //console.log("remove", file);
      await removeFile(file)
        .catch(e => console.log(e));
    }
  }
}
