require("dotenv").config();
import { readFile, writeFile, removeFile } from "./imps/WebOSFileService";
import { License } from "./license";
import { EventEmitter } from "fbemitter";

class Config {
  private static _instance: Config;
  _licenseInstance: License;
  _emitter: EventEmitter;

  private constructor() {
    this._emitter = new EventEmitter();
    this._emitter.addListener("log", (type: EventType, message: string) => {
      console.log(`${type},${message}`);
    });
  }

  configRead(): Promise<License> {
    return new Promise((resolve, reject) => {
      readFile(`${APP_ROOT}/config.json`)
        .then(content => {
          this._licenseInstance = JSON.parse(content);
          resolve(this._licenseInstance);
        })
        .catch(e => {
          reject(e);
        });
    });
  }

  licenseReset() {
    removeFile(`${APP_ROOT}/config.json`);
  }

  licenseWrite(license: License): Promise<boolean> {
    this._licenseInstance = license;
    return writeFile(
      `${APP_ROOT}/config.json`,
      JSON.stringify(license)
    );
  }

  get deviceId(): string {
    return this._licenseInstance.deviceId;
  }

  get token():string{
    return this._licenseInstance.token;
  }

  get resourceServer():string{
    return this._licenseInstance.resourceServer
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
export const configInstance: Config = Config.instance;
export const MQTT_Server = "ws://www.ioliz.com:8000";
export const HTTP_Server = "http://www.ioliz.com";
//事件类型
export enum EventType {
  FileDownload
}