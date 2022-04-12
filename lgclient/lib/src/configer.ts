require("dotenv").config();
import { readFile, writeFile, removeFile, exists, mkdir } from "./imps/WebOSFileService";
import { ConfigModel } from "./dataModels/ConfigModel"
import { EventEmitter } from "fbemitter";

class Configer {
  private static _instance: Configer;
  _configInstance: ConfigModel;
  _emitter: EventEmitter;

  private constructor() {
    this._emitter = new EventEmitter();
    this._configInstance = <ConfigModel>{
      
    }
    this._emitter.addListener("log", (type: EventType, message: string) => {
      console.log(`${type},${message}`);
    });
    this.rootDirReady();
  }

  read(): Promise<ConfigModel> {
    return new Promise((resolve, reject) => {
      readFile(`${APP_DIR}/config.json`)
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
    removeFile(`${APP_DIR}/config.json`);
  }

  write(config: ConfigModel): Promise<boolean> {
    this._configInstance = config;
    return writeFile(
      `${APP_DIR}/config.json`,
      JSON.stringify(config)
    );
  }

  rootDirReady = () => {
    exists(APP_DIR)
      .then((exist) => {
        if (!exist) {
          return mkdir(APP_DIR);
        }
        return true;
      })
      .then((res) => {
        console.log(res);
      })
      .catch((e) => {
        console.log("mkdsDir", e);
      });
  };

  get deviceId(): string {
    return this._configInstance.deviceId;
  }

  get token(): string {
    return this._configInstance.token;
  }

  get fileServer(): string {
    return this._configInstance.fileServer
  }

  get mqttServer(): string {
    return this._configInstance.mqttServer
  }

  get emitter() {
    return this._emitter;
  }

  public static get instance() {
    return this._instance || (this._instance = new this());
  }
}

export const APPID = "com.ioliz.dc.app";
export const APP_DIR = "/media/internal/dclient";
export const APP_DOWNLOAD_DIR = "/media/internal/downloads";
export const USB_ROOT = "/tmp/usb/sda/sda1";
export const instance: Configer = Configer.instance;
export const Service_Server = process.env.REACT_APP_MEMBER_URL;
export const Auth_Server = process.env.REACT_APP_AUTH_URL;
//是否是单元测试
export const isInTest = typeof global.it === 'function';
//事件类型
export enum EventType {
  FileDownload
}