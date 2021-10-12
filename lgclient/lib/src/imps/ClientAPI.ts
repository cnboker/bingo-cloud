import IClientAPI from "../interfaces/IClientAPI";
import axios, { AxiosResponse } from "axios";
import * as APIPath from "../constants/apiPaths";
import NotificationResult from "../dataModels/notificationResult";
import GeneralResult from "../dataModels/generalResult";
import GetContentResult from "../dataModels/getContentResult";
import WeatherResult from "../dataModels/weatherResult";
import NetTrafficInfo from "../dataModels/netTrafficInfo";
import { configInstance } from "../config";

const strFormat = require("string-format");
//const qs = require("querystring");

export default class ClientAPI implements IClientAPI {
  get token(): string {
    return configInstance.licenseInstance.token;
  }

  get dsServer(): string {
    return configInstance.licenseInstance.apiUrl;
  }

  get key(): string {
    return configInstance.licenseInstance.deviceId;
  }


  notify(): Promise<AxiosResponse<NotificationResult>> {
    const qs = require("querystring");
    var url = this.dsServer + strFormat(APIPath.NotifyPath, this.key);
    //console.log("url=", url);
    return axios.request<NotificationResult>({
      url,
      method: "get",
      headers: {
        Authorization: "Bearer " + this.token
      }
    });
  }

  notifyPost(notificationId: number): Promise<AxiosResponse<GeneralResult>> {
    var url = this.dsServer + strFormat(APIPath.NotifyPath, notificationId);
    //console.log("url=", url);
    return axios.request<GeneralResult>({
      url,
      method: "post",
      headers: {
        Authorization: "Bearer " + this.token
      }
    });
  }

  getContent(contentId: number): Promise<AxiosResponse<GetContentResult>> {
    const qs = require("querystring");
    var url = this.dsServer + strFormat(APIPath.GetContentPath, contentId);
    //console.log("url=", url);
    return axios.request<GetContentResult>({
      url,
      method: "get",
      headers: {
        Authorization: "Bearer " + this.token
      }
    });
  }

  updateSnapshot(key: string, snapshotPath: string): void {
    throw new Error("Method not implemented.");
  }

  updateSnapshot2(imageBaseData: string): void {
    var url = this.dsServer + APIPath.SnapshotPath2;
    //console.log("url=", url);
    axios
      .request<GeneralResult>({
        url,
        method: "post",
        data: {
          key:this.key,
          content: imageBaseData
        },
        headers: {
          Authorization: "Bearer " + this.token
        }
      })
      .then(x => {
        console.log("updateSnapshot2", x.data);
      });
  }

  uploadMyinformation(
    key: string,
    playProgram: string,
    channel: string,
    slots: string,
    fileName: string,
    fileSize: string,
    filePercent: string
  ): import("../dataModels/generalResult").default {
    throw new Error("Method not implemented.");
  }

  log(
    key: string,
    level: number,
    message: string
  ): Promise<AxiosResponse<GeneralResult>> {
    var url = this.dsServer + APIPath.LogPath;
    //console.log("url=", url);
    return axios.request<GeneralResult>({
      url,
      method: "post",
      data: {
        key,
        level,
        message
      },
      headers: {
        Authorization: "Bearer " + this.token
      }
    });
  }

  heartbeat(key: string): Promise<AxiosResponse<GeneralResult>> {
    var url = this.dsServer + strFormat(APIPath.HeartbeatPath, key);
    //console.log("url=", url);
    return axios.request<GeneralResult>({
      url,
      method: "get",
      headers: {
        Authorization: "Bearer " + this.token
      }
    });
  }

  postNetTrafficInfo(
    deviceId: string,
    data: NetTrafficInfo
  ): Promise<AxiosResponse<GeneralResult>> {
    var url = this.dsServer + APIPath.NetTrafficInfoPath;
    //console.log("url=", url);
    return axios.request<WeatherResult>({
      url,
      method: "post",
      data,
      headers: {
        Authorization: "Bearer " + this.token
      }
    });
  }

  getWeather(city: string): Promise<AxiosResponse<WeatherResult>> {
    var url = this.dsServer + strFormat(APIPath.WeatherPath, city);
    console.log("getweather url=", url);
    return axios.request<WeatherResult>({
      url,
      method: "get",
      headers: {
        Authorization: "Bearer " + this.token
      }
    });
  }

  playCount(
    channelId: number,
    deviceId: number
  ): Promise<AxiosResponse<GeneralResult>> {
    var url = this.dsServer + APIPath.PlayCountPath;
    //console.log("url=", url);
    return axios.request<WeatherResult>({
      url,
      method: "post",
      data: {
        channelId,
        deviceId
      },
      headers: {
        Authorization: "Bearer " + this.token
      }
    });
  }
}
