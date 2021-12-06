import { ContentPackage } from '../dataModels/ContentPackage';
/*
1. 定时轮询监视是否有新的通知
2. 如果有更新通知，并根据通知类型做相应处理
*/
export interface IContentWorker {
    contentNotify: IContentNotify;
    execute(cb: () => void): void;
}

export interface IContentNotify {
    //通知监控
    watch(): void;
    //接收新内容发布通知，根据通知类型做处理
    onContentReady(callback: (contentPackage: ContentPackage) => void): void;
    //接受截屏通知
    onSnapshot(callback: () => void): void;
}

//资源数据
export interface IResourceInfo {
    resourceUrl: string,
    status?: number //0 origin, 1 success, 2. failure, 3. begin
}

//资源下载器
export interface IFileDownloader {
    //资源列表
    fileList: IResourceInfo[];
    //开始下载
    download(): void;
    //下载完成
    onDownloadComplete(callback:(fileList:IResourceInfo[])=>void):void;
    //取消所有下载
    cancel():void;
}
