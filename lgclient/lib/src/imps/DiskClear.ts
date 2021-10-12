import { ContentPackage } from "../dataModels/ContentPackage";
import { ResrouceParser } from "./ResourceParser";
import { configInstance } from "../config";
import { safeUrl } from "./util";
import { IResourceInfo } from "../interfaces/IContentWorker";

export default class DiskClear {
  //当前播放的资源包
  contentPackage: ContentPackage;
  constructor(contentPackage: ContentPackage) {
    this.contentPackage = contentPackage;
  }

  async clean(): Promise<void> {
    var parser = new ResrouceParser(this.contentPackage);
    var reslist = parser.parseResource();
    await this.clearOldResource(reslist).then(() => console.log("clear files ok"));
  }

  private async clearOldResource(result: IResourceInfo[]): Promise<void> {
    if (result.length === 0) return;
    var outFiles: string[] = [];
    //get all files
    await configInstance.fileIOInstance.listAllFile("/UploadFiles", outFiles);
    console.log("allfiles", JSON.stringify(outFiles));
    //exclude files
    const removeFiles = outFiles.filter(function(x) {
      return result.map(e => safeUrl(e.resourceUrl)).indexOf(x) < 0;
    });
    //remove
    console.log("remove old files",removeFiles);
    for (var file of removeFiles) {
      //console.log("remove", file);
      await configInstance.fileIOInstance
        .removeFile(file)
        .catch(e => console.log(e));
    }
  }
}
