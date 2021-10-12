export default interface NetTrafficInfo
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