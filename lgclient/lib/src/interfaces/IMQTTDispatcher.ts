import { ContentPackage } from "../dataModels/ContentPackage";

export interface IMQTTDispatcher{
  //connect mqtt server
  connect(server:string,deviceId:string):void;
  //publish mqttDownloadProgress event
  pubDownloadProgress(data:any):void;
  //接收新内容发布
  onSubContentNotify:(data:ContentPackage)=>void;
  onSubSnapshotNotify:()=>void;
}