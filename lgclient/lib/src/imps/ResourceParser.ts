import { IResourceInfo } from "../interfaces/IContentWorker";
import { ContentPackage, Playlist, Program, Region, JsonImage, JsonMedia } from "../dataModels/ContentPackage";
import { ContentType } from "../constants/contentType";

export class ResrouceParser {
  contentPackage: ContentPackage;
  constructor(contentPackage: ContentPackage) {
    this.contentPackage = contentPackage;
  }
  
  parseResource(): Array<IResourceInfo> {
    var playlist = this.contentPackage.channel.playlist;
    let resoureList: Array<IResourceInfo> = [];
    for (let pl of playlist) {
      var result = this.playlistParser(pl);
      resoureList.push(...result);
    }
    return resoureList;
  }

  private playlistParser(playlist: Playlist): Array<IResourceInfo> {
    let resoureList: Array<IResourceInfo> = [];
    for (let program of playlist.programs) {
      var result = this.programParser(program);
      resoureList.push(...result);
    }
    return resoureList;
  }

  private programParser(program: Program): Array<IResourceInfo> {
    let resoureList: Array<IResourceInfo> = [];
    for (let region of program.regions) {
      var result = this.regionParser(region);
      resoureList.push(...result);
    }
    return resoureList;
  }

  private regionParser(region: Region): Array<IResourceInfo> {
    let resoureList: Array<IResourceInfo> = [];
    if (region.content.contentType === ContentType.Image) {
      var imageObj: JsonImage = region.content as JsonImage;
      for (var image of imageObj.images) {
        var resource: IResourceInfo = {
          contentType: ContentType.Image,
          resourceUrl: image,
          status: 0
        };
        resoureList.push(resource);
      }
    } else if (region.content.contentType === ContentType.Media) {
      var objs: JsonMedia = region.content as JsonMedia;
      for (var url of objs.mediaUrls) {
        var resource: IResourceInfo = {
          contentType: ContentType.Media,
          resourceUrl: url,
          status: 0
        };
        resoureList.push(resource);
      }
    }
    return resoureList;
  }
}
