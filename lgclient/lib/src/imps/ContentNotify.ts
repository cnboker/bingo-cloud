import { IContentNotify } from "../interfaces/IContentWorker";
import ClientAPI from "./ClientAPI";
import EventDispatcher from "./EventDispatcher";
import { CONTENT_READY_EVENT,SNAPSHOT_EVENT } from '../constants'
import { instance } from "../configer";
import { mqttConnect, mqttSubscrible, MQTT_CONTENT_NOTIFY, MQTT_SNAPSHOT_NOTIFY } from "./MQTTDispatcher";
import { ContentPackage } from "../dataModels/ContentPackage";

const clientAPI = new ClientAPI();
export default class ContentNotify implements IContentNotify {
  timeout: number = 1000 * 10;
  dispatcher: EventDispatcher;

  constructor() {
    this.dispatcher = new EventDispatcher();
    mqttConnect(instance.mqttServer, (title: string, message: string) => {
      var jsonObj = JSON.parse(message)
      if (title === `${MQTT_CONTENT_NOTIFY}/${instance.deviceId}`) {
        this.dispatcher.dispatch(CONTENT_READY_EVENT, jsonObj);
      } else if (title === `${MQTT_SNAPSHOT_NOTIFY}/${instance.deviceId}`) {
        this.snapshotProcess();
      }
    })
    mqttSubscrible(instance.deviceId, MQTT_CONTENT_NOTIFY)
    mqttSubscrible(instance.deviceId, MQTT_SNAPSHOT_NOTIFY)
  }
  onContentReady(callback: (contentPackage: ContentPackage) => void): void {
    this.dispatcher.subscribe(CONTENT_READY_EVENT, callback);
  }

  onSnapshot(callback: () => void): void {
    this.dispatcher.subscribe(SNAPSHOT_EVENT,callback)
  }

  watch(): void {
    setInterval(this.updateBeatheart.bind(this), this.timeout);
  }

  private updateBeatheart() {
    if (!instance.token) return;
    clientAPI.heartbeat(instance.deviceId).then(x => {
      //console.log("update beatheart", x.data);
    });
  }

  snapshotProcess(): void {
    console.log("snapshotProcess call...");
    this.doCapture().then(data => {
      clientAPI.updateSnapshot(data);
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
