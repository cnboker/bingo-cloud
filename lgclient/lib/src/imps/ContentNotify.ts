import { IContentNotify } from "../interfaces/IContentWorker";
import EventDispatcher from "./EventDispatcher";
import { CONTENT_READY_EVENT, SNAPSHOT_EVENT } from '../constants'
import { instance } from "../configer";
import { ContentPackage } from "../dataModels/ContentPackage";
import IClientAPI from "../interfaces/IClientAPI";
import { getService } from "./ServiceProiver";
import { IMQTTDispatcher } from "../interfaces/IMQTTDispatcher";
export default class ContentNotify implements IContentNotify {
  private timeout: number = 1000 * 10;
  private dispatcher: EventDispatcher;
  private clientAPI: IClientAPI

  onSnapshot(callback: () => void): void {
    this.dispatcher.subscribe(SNAPSHOT_EVENT, callback)
  }

  watch(): void {
    this.dispatcher = new EventDispatcher();
    this.clientAPI = <IClientAPI>getService("IClientAPI");
    const mqttDispather = <IMQTTDispatcher>getService("IMQTTDispatcher");
  
    mqttDispather.onSubSnapshotNotify = () => {
      this.snapshotProcess();
    }

    setInterval(this.updateBeatheart.bind(this), this.timeout);
  }

  private updateBeatheart() {
    if (!instance.token) return;
    this.clientAPI.heartbeat(instance.deviceId).then(x => {
      //console.log("update beatheart", x.data);
    });
  }

  snapshotProcess(): void {
    console.log("snapshotProcess call...");
    this.doCapture().then(data => {
      this.clientAPI.updateSnapshot(data);
    });
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

      var successCB = function (cbObject: any) {
        var size = cbObject.size;
        var encoding = cbObject.encoding;
        var data = cbObject.data;

        console.log(" doCapture Got Data size:" + cbObject);
        resolve(data);
        //resolve("data:image/jpeg;base64," + data);
      };

      var failureCB = function (cbObject: any) {
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
}
