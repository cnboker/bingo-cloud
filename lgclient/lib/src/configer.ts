require("dotenv").config();
import { readFile, writeFile, removeFile } from "./imps/WebOSFileService";
import { Config } from "./configModels";
import { EventEmitter } from "fbemitter";

class Configer {
  private static _instance: Configer;
  _configInstance: Config;
  _emitter: EventEmitter;

  private constructor() {
    this._emitter = new EventEmitter();
    this._emitter.addListener("log", (type: EventType, message: string) => {
      console.log(`${type},${message}`);
    });
  }

  read(): Promise<Config> {
    return new Promise((resolve, reject) => {
      readFile(`${APP_ROOT}/config.json`)
        .then(content => {
          this._configInstance = JSON.parse(content);
          resolve(this._configInstance);
        })
        .catch(e => {
          reject(e);
        });
    });
  }

  reset() {
    removeFile(`${APP_ROOT}/config.json`);
  }

  write(config: Config): Promise<boolean> {
    this._configInstance = config;
    return writeFile(
      `${APP_ROOT}/config.json`,
      JSON.stringify(config)
    );
  }

  get deviceId(): string {
    return this._configInstance.deviceId;
  }

  get token():string{
    return this._configInstance.token;
  }

  get fileServer():string{
    return this._configInstance.FileServer
  }
  
  get mqttServer():string{
    return this._configInstance.MQTTServer
  }

  get emitter() {
    return this._emitter;
  }

  public static get instance() {
    return this._instance || (this._instance = new this());
  }
}

export const APPID = "com.ioliz.dc.app";
export const APP_ROOT = "/meida/internal/dclient";
export const USB_ROOT = "/tmp/usb/sda/sda1";
export const instance: Configer = Configer.instance;
export const Service_Server = process.env.REACT_APP_MEMBER_URL;
export const Auth_Server = process.env.REACT_APP_AUTH_URL;

//事件类型
export enum EventType {
  FileDownload
}