import GeneralResult from "../dataModels/generalResult";
import NotificationResult from '../dataModels/notificationResult';
import GetContentResult from '../dataModels/getContentResult';
import NetTrafficInfo from '../dataModels/netTrafficInfo';
import WeatherResult from '../dataModels/WeatherResult';
import { AxiosResponse } from "axios";

export default interface IClientAPI {   
    notify(): Promise<AxiosResponse<NotificationResult>>;
    notifyPost(notificationId: number): Promise<AxiosResponse<GeneralResult>>;
    getContent(contentId: number): Promise<AxiosResponse<GetContentResult>>;
    updateSnapshot(key: string, snapshotPath: string): void;
    updateSnapshot2(imageBaseData: string): void;
    uploadMyinformation(key: string, playProgram: string, channel: string, slots: string, fileName: string, fileSize: string, filePercent: string):GeneralResult;
    log(key:string,level:number,message:string):Promise<AxiosResponse<GeneralResult>>;
    heartbeat(key:string):Promise<AxiosResponse<GeneralResult>>;
    postNetTrafficInfo(deviceId:string,data:NetTrafficInfo):Promise<AxiosResponse<GeneralResult>>;
    getWeather(city:string):Promise<AxiosResponse<WeatherResult>>;
    playCount(type:number,id:number):Promise<AxiosResponse<GeneralResult>>;    
}

