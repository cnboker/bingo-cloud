import axios, { AxiosResponse } from "axios";
import * as APIPath from "../constants/apiPaths";
import GeneralResult from "../dataModels/generalResult";
import NetTrafficInfo from "../dataModels/netTrafficInfo";
import {instance, Service_Server } from "../configer";
import IClientAPI from "../interfaces/IClientAPI";

const strFormat = require("string-format");

export default class ClientAPI implements IClientAPI {

  updateSnapshot(imageBaseData: string): void {
    var url = Service_Server + APIPath.SnapshotPath;
    //console.log("url=", url);
    axios
      .request<GeneralResult>({
        url,
        method: "post",
        data: {
          key:instance.deviceId,
          content: imageBaseData
        },
        headers: {
          Authorization: "Bearer " + instance.token
        }
      })
      .then(x => {
        console.log("updateSnapshot2", x.data);
      });
  }

  log(
    key: string,
    level: number,
    message: string
  ): Promise<AxiosResponse<GeneralResult>> {
    var url = Service_Server + APIPath.LogPath;
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
        Authorization: "Bearer " + instance.token
      }
    });
  }

  heartbeat(key: string): Promise<AxiosResponse<GeneralResult>> {
    var url = Service_Server + strFormat(APIPath.HeartbeatPath, key);
    //console.log("url=", url);
    return axios.request<GeneralResult>({
      url,
      method: "get",
      headers: {
        Authorization: "Bearer " + instance.token
      }
    });
  }

  postNetTrafficInfo(
    deviceId: string,
    data: NetTrafficInfo
  ): Promise<AxiosResponse<GeneralResult>> {
    var url = Service_Server + APIPath.NetTrafficInfoPath;
    //console.log("url=", url);
    return axios.request<NetTrafficInfo>({
      url,
      method: "post",
      data,
      headers: {
        Authorization: "Bearer " + instance.token
      }
    });
  }

}
