import IClientAPI from "../interfaces/IClientAPI";
import axios, { AxiosResponse } from "axios";
import * as APIPath from "../constants/apiPaths";
import NotificationResult from "../dataModels/notificationResult";
import GeneralResult from "../dataModels/generalResult";
import GetContentResult from "../dataModels/getContentResult";
import WeatherResult from "../dataModels/weatherResult";
import NetTrafficInfo from "../dataModels/netTrafficInfo";
import { instance,HTTP_Server,MQTT_Server } from "../config";

const strFormat = require("string-format");

export default class ClientAPI implements IClientAPI {
  get token(): string {
    return instance.token;
  }

  get resourceServer(): string {
    return instance.resourceServer;
  }

  get key(): string {
    return instance.deviceId;
  }


  notify(): Promise<AxiosResponse<NotificationResult>> {
    var url = HTTP_Server + strFormat(APIPath.NotifyPath, this.key);
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
    var url = HTTP_Server + strFormat(APIPath.NotifyPath, notificationId);
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
    var url = HTTP_Server + strFormat(APIPath.GetContentPath, contentId);
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
    var url = HTTP_Server + APIPath.SnapshotPath2;
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
    var url = HTTP_Server + APIPath.LogPath;
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
    var url = HTTP_Server + strFormat(APIPath.HeartbeatPath, key);
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
    var url = HTTP_Server + APIPath.NetTrafficInfoPath;
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
    var url = HTTP_Server + strFormat(APIPath.WeatherPath, city);
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
    var url = HTTP_Server + APIPath.PlayCountPath;
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
