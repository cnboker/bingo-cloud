import {
  IResourceDownloader,
  IResourceInfo,
  IContentEvent
} from "../interfaces/IContentWorker";
import { SimpleEventDispatcher } from "ste-simple-events";
import {
  ContentPackage,
} from "../dataModels/ContentPackage";
import { connect } from "mqtt";
import { MQTT_Server, configInstance } from "../config";
import { ResrouceParser } from "./ResourceParser";

var client: any;
if (client === undefined || !client.connected) {
  client = connect(MQTT_Server);
}

function mqttSend(json: any) {
  var jsonString = JSON.stringify({
    deviceId: configInstance.deviceId,
    ...json
  });
  if (client.connected) {
    console.log(`LGDownloadProgress/${configInstance.deviceId}`,jsonString)
    client.publish(`LGDownloadProgress/${configInstance.deviceId}`, jsonString);
  }
}

export class ResourceDownloader implements IResourceDownloader {
  contentPackage: ContentPackage;
  private dispatcher = new SimpleEventDispatcher<IResourceInfo[]>();
  private singleDispatcher = new SimpleEventDispatcher<IResourceInfo>();

  constructor(contentPackage: ContentPackage) {
    this.contentPackage = contentPackage;
  }

  downloadCompleteEvent(): IContentEvent<IResourceInfo[]> {
    return this.dispatcher.asEvent();
  }

  singleFileDownloadCompleteEvent(): IContentEvent<IResourceInfo> {
    return this.singleDispatcher.asEvent();
  }

  download(): void {
    var parser = new ResrouceParser(this.contentPackage);
    var resourceInfo = parser.parseResource();
    var result: IResourceInfo[] = [];
    this.singleFileDownloadCompleteEvent().subscribe(res => {
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
        configInstance.fileIOInstance
          .writeFile("package.json", JSON.stringify(this.contentPackage))
          .then(err => {
            if (err) {
              console.log("write package.json error", err);
              return;
            }
          });
        this.dispatcher.dispatch(result);
      }
    });

    //download first file
    if (resourceInfo.length > 0) {
      this.singleFileDownload(resourceInfo[0]);
    } else {
      this.dispatcher.dispatch(result);
    }

    //generate media playlist
  }

  singleFileDownload(resource: IResourceInfo): void {
    console.log("begin download", resource.resourceUrl);
    resource.status = 3;
    var apiUrl = `${configInstance.licenseInstance.dsUrl}${resource.resourceUrl}`;
    //console.log("singleFileDownload", url_parts.pathname, apiUrl);
    configInstance.fileIOInstance
      .exists(resource.resourceUrl)
      .then(x => {
        //console.log('exists', x)
        if (x) {
          console.log(`${resource.resourceUrl} exists return`);
          return resource.resourceUrl;
        } else {
          return configInstance.fileIOInstance.copyFile(
            apiUrl,
            resource.resourceUrl,
            percentResult => {
              console.log("download result:", JSON.stringify(percentResult));
              mqttSend(percentResult);
            }
          );
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
        this.singleDispatcher.dispatch(resource);
      });
  }

  
}
