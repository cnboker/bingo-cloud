import { IContentNotify, IContentEvent } from "../interfaces/IContentWorker";
import { ContentPackage } from "../dataModels/ContentPackage";
import ClientAPI from "./ClientAPI";
import { configInstance } from "../config";
import EventDispatcher from "../EventDispatcher";
import { CONTENT_READY_EVENT,SNAPSHOT_EVENT } from '../constants'
const timeout: number = 10000;

const clientAPI = new ClientAPI();
export default class ContentNotify implements IContentNotify {
  
  dispatcher:EventDispatcher;
  
  constructor(dis:EventDispatcher){
    this.dispatcher = dis
  }
  
  watch(): void {
    if(!configInstance.licenseInstance.inValid){
      setInterval(this.notifyProcess.bind(this), timeout);
    }
  }

  private updateBeatheart() {
    clientAPI.heartbeat(clientAPI.key).then(x => {
      //console.log("update beatheart", x.data);
    });
  }

  //通知处理
  private notifyProcess() {
    this.updateBeatheart();
    clientAPI
      .notify()
      .then(x => {
        if (x.data.result === 0) {
          throw "none message";
        }
        return x.data;
      })
      .then(messageRep => {
        clientAPI.notifyPost(messageRep.nofityId);
        return messageRep;
      })
      .then(messageRep => {
        if (messageRep.messageType === 1) {
          this.channelContentProcess(messageRep.contentId);
        } else if (messageRep.messageType === 3) {
          this.snapshotProcess();
        }
      })
      .catch(e => {
        console.log(e);
      });
  }

  snapshotProcess(): void {
    console.log("snapshotProcess call...");
    this.doCapture().then(data => {
      clientAPI.updateSnapshot2(data);
    });
    this.dispatcher.dispatch(SNAPSHOT_EVENT)
  }

  doCapture(): Promise<string> {
    return new Promise((resolve, reject) => {
      //@ts-ignore
      var options = {
        save: false, //not save local
        thumbnail: false,
        //@ts-ignore
        //imgResolution: window.Signage.ImgResolution.HD
      };

      var successCB = function(cbObject: any) {
        var size = cbObject.size;
        var encoding = cbObject.encoding;
        var data = cbObject.data;

        console.log(" doCapture Got Data size:" + cbObject);
        resolve(data);
        //resolve("data:image/jpeg;base64," + data);
      };

      var failureCB = function(cbObject: any) {
        var errorCode = cbObject.errorCode;
        var errorText = cbObject.errorText;
        var error = "Error Code [" + errorCode + "]: " + errorText;
        console.log(error);
        reject(error);
      };
      //@ts-ignore
      var signage = new window.Signage();
      //@ts-ignore
      signage.captureScreen(successCB, failureCB, options);
    });
  }

  channelContentProcess(contentId: number): void {
    console.log("channelContentProcess call...");

    clientAPI.getContent(contentId).then(x => {
      var jsonContentString: string = x.data.content;
      var contentPackage: ContentPackage = JSON.parse(jsonContentString);
      this.dispatcher.dispatch(CONTENT_READY_EVENT,contentPackage);
    });
  }
}
