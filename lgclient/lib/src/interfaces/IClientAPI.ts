import GeneralResult from "../dataModels/generalResult";
import NetTrafficInfo from '../dataModels/netTrafficInfo';
import { AxiosResponse } from "axios";

export default interface IClientAPI {   
    updateSnapshot(imageBaseData: string): void;
    log(key:string,level:number,message:string):Promise<AxiosResponse<GeneralResult>>;
    heartbeat(key:string):Promise<AxiosResponse<GeneralResult>>;
    postNetTrafficInfo(deviceId:string,data:NetTrafficInfo):Promise<AxiosResponse<GeneralResult>>;    
}

