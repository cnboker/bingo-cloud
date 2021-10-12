require("dotenv").config();
process.env.ROOT = "d:/ds";

//import NodeFilePersistHandler from "./imps/NodeFilePersistHandler";
import WebOSFilePersistHandler from "./imps/WebOSFilePersistHandler";
import { License } from "./license";
import { EventEmitter } from "fbemitter";
import { IFilePersistHandler } from "./interfaces/IFilePersistHandler";

//事件类型
export enum EventType {
  FileDownload
}

class Config {
  private static _instance: Config;
  _fileIOInstance: IFilePersistHandler;
  _licenseInstance: License;
  _emitter: EventEmitter;

  private constructor() {
    this._fileIOInstance = new WebOSFilePersistHandler();
    //this._licenseInstance = require('./license.json');
    this._emitter = new EventEmitter();
    this._emitter.addListener("log", (type: EventType, message: string) => {
      console.log(`${type},${message}`);
    });
  }

  licenseRead(): Promise<License> {
    return new Promise((resolve, reject) => {
      this._fileIOInstance
        .readFile("/license.bat")
        .then(content => {
          this._licenseInstance = JSON.parse(content);
         // this.licenseDebug();
          //hard code mac
          resolve(this._licenseInstance);
        })
        .catch(e => {
          reject(e);
        });
    });
  }

  

  licenseDebug() {
    this._licenseInstance.deviceId = "0800278A2B2B";
    //this._licenseInstance.apiUrl = "http://dsapi1.ezdsm.com/";
    this._licenseInstance.dsUrl = "http://ds1.ezdsm.com/";
    // this._licenseInstance.token =
    //   "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy93cy8yMDA1LzA1L2lkZW50aXR5L2NsYWltcy9uYW1lIjoic2NvdHQiLCJpc0FnZW50IjoiZmFsc2UiLCJ1c2VyU2V0dGluZyI6IntcclxuICBcImRtc0RlZmF1bHRcIjogZmFsc2VcclxufSIsImVtYWlsIjoiNjM0ODgxNkBxcS5jb20iLCJzdWIiOiJzY290dCIsImp0aSI6IjkwMzFmNzVmLTRkZDctNDQ1Yy04NDFiLTczOGQ2NmZhYmNhZSIsImlhdCI6MTU2OTQ4NDYxOSwibmJmIjoxNTY5NDg0NjE5LCJleHAiOjE4ODQ4NDQ2MTksImlzcyI6IkRlbW9fSXNzdWVyIiwiYXVkIjoiRGVtb19BdWRpZW5jZSJ9.eNXvSlolHQahao4qpEFpRnX679L-D2Wsppib_kikNd4";
  }

  licenseReset(){
    this._fileIOInstance.removeFile('license.bat');
  }
  
  licenseWrite(license: License): Promise<string> {
    this._licenseInstance = license;
    return this._fileIOInstance.writeFile(
      "/license.bat",
      JSON.stringify(license)
    );
  }

  get deviceId(): string {
    return this._licenseInstance.deviceId;
  }

  get licenseInstance() {
    return this._licenseInstance;
  }

  get fileIOInstance() {
    return this._fileIOInstance;
  }

  get emitter() {
    return this._emitter;
  }

  public static get instance() {
    return this._instance || (this._instance = new this());
  }
}

// export const licenseInstance: License = Config.instance.licenseInstance;
// export const fileIOInstance: IFilePersistHandler =
//   Config.instance.fileIOInstance;
// export const emitter: EventEmitter = Config.instance.emitter;
export const DS_FILE_ROOT = "file://internal/ds";
export const USB_ROOT = "file://usb:1";
export const configInstance: Config = Config.instance;
export const MQTT_Server = "ws://www.ezdsm.com:8000";