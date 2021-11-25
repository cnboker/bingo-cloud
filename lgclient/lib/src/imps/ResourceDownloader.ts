import {
  IResourceDownloader,
  IResourceInfo
} from "../interfaces/IContentWorker";
import {
  ContentPackage,
} from "../dataModels/ContentPackage";
import { connect } from "mqtt";
import { instance } from "../configer";
import { ResrouceParser } from "./ResourceParser";
import { SINGLE_FILE_DOWNLOAD_COMPLETE_EVENT,DOWNLAOD_COMPLETE_EVENT } from '../constants'
import EventDispatcher from "../EventDispatcher";
import { writeFile, exists } from './WebOSFileService'
import { download } from '../webosApis/downloadManager'
var client: any;


function mqttSend(json: any) {
  if (client === undefined || !client.connected) {
    client = connect(instance.mqttServer);
  }
  var jsonString = JSON.stringify({
    deviceId: instance.deviceId,
    ...json
  });
  if (client.connected) {
    console.log(`LGDownloadProgress/${instance.deviceId}`, jsonString)
    client.publish(`LGDownloadProgress/${instance.deviceId}`, jsonString);
  }
}

export class ResourceDownloader implements IResourceDownloader {
  contentPackage: ContentPackage;


  constructor(contentPackage: ContentPackage) {
    this.contentPackage = contentPackage;
  }
  dispatcher: EventDispatcher;


  download(): void {
    var parser = new ResrouceParser(this.contentPackage);
    var resourceInfo = parser.parseResource();
    var result: IResourceInfo[] = [];
    this.dispatcher.subscribe(SINGLE_FILE_DOWNLOAD_COMPLETE_EVENT, (res: IResourceInfo) => {
      //console.log("file download completed", res);
      result.push(res);
      resourceInfo = resourceInfo.filter(x => {
        return x.resourceUrl != res.resourceUrl;
      });
      if (resourceInfo.length > 0) {
        this.singleFileDownload(resourceInfo[0]);
      } else {

        var playlist = this.contentPackage.channel.playlist[0];
        //屏蔽日历
        playlist.calender = [];
        writeFile("package.json", JSON.stringify(this.contentPackage))
          .then(err => {
            if (err) {
              console.log("write package.json error", err);
              return;
            }
          });
        this.dispatcher.dispatch(SINGLE_FILE_DOWNLOAD_COMPLETE_EVENT, result);
      }
    });

    //download first file
    if (resourceInfo.length > 0) {
      this.singleFileDownload(resourceInfo[0]);
    } else {
      this.dispatcher.dispatch(DOWNLAOD_COMPLETE_EVENT,result);
    }

    //generate media playlist
  }

  singleFileDownload(resource: IResourceInfo): void {
    console.log("begin download", resource.resourceUrl);
    resource.status = 3;
    var apiUrl = `${instance.fileServer}${resource.resourceUrl}`;

    exists(resource.resourceUrl)
      .then(x => {
        if (x) {
          console.log(`${resource.resourceUrl} exists return`);
          return resource.resourceUrl;
        } else {
         download(
            apiUrl,
            resource.resourceUrl,
            percentResult => {
              console.log("download result:", JSON.stringify(percentResult));
              mqttSend(percentResult);
            }
          )
        }
      })
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
