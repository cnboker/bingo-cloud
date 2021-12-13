
export interface ConfigModel {
  userName : string;
  deviceId : string;
  //当前设备文件根路径，比如http://ip:port/scott/
  fileServer : string;
  mqttServer:string;
  token : string;
}