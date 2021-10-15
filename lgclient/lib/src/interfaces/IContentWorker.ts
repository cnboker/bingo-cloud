import { ContentPackage } from '../dataModels/ContentPackage';
//import { ISimpleEvent } from "ste-simple-events";
import { ContentType } from '../constants/contentType';
import EventDispatcher from '../EventDispatcher';
interface ISimpleEvent<Targs>{}
/*
1. 定时轮询监视是否有新的通知
2. 如果有更新通知，并根据通知类型做相应处理
2.1 频道通知处理逻辑：1). 通过API获取频道json数据， 2）解析数据， 3） 下载资源内容存储。 4）修改资源包url地址未本地地址. 5)推送事件给前台程序展示内容
2.3. 截屏通知处理逻辑： 1). 截屏， 2）上传截屏内容到服务器
*/

export interface IContentWorker {
    contentPackage: ContentPackage;
    contentNotify: IContentNotify;
    execute(cb:(resource:ContentPackage)=>void): void;
}

export interface IContentNotify {
    //通知监控
    watch(): void;
    dispatcher:EventDispatcher
    //接收通知，根据通知类型做处理
    //contentReadyEvent(): IContentEvent<ContentPackage>;
    //snapshotEvent(): IContentEvent<void>;
}

//通知接口实现
export interface INotifyHandler {
    execute(): void;
}


//截屏通知处理
export interface ISnapshotNotifyHandler extends INotifyHandler {
    execute(): void;
}

//资源数据
export interface IResourceInfo {
    contentType: ContentType,
    resourceUrl: string,
    status?:number //0 origin, 1 success, 2. failure, 3. begin
}

//资源下载器
export interface IResourceDownloader {
    dispatcher:EventDispatcher
    //资源列表
    contentPackage: ContentPackage;
    //开始下载
    download(): void;   
    //资源下载完成通知
    //downloadCompleteEvent(): IContentEvent<Array<IResourceInfo>>;
    //singleFileDownloadCompleteEvent(): IContentEvent<IResourceInfo>;
}

//
export interface IContentEvent<TArgs> extends ISimpleEvent<TArgs> {

}