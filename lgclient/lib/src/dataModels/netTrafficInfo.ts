import GeneralResult from "./generalResult";

export default interface NetTrafficInfo extends GeneralResult
{
    deviceName: string;
    startDate: Date | string;
    endDate: Date | string;
    bytesReceived: number;
    networkInterfaceType: string;
    speed: number;
    bytesSent: number;
    isNetworkOnline: boolean;
}