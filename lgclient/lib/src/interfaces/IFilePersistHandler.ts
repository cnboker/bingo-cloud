import { ProgressResult } from "../imps/downloadProgress";

export interface IFilePersistHandler{
    copyFile(originalPath:string,copyPath:string,cbProgress?: (result: ProgressResult) => void):Promise<any>;
    exists(path:string): Promise<boolean>;
    listFiles(dir:string):Promise<any>;
    mkdir(path:string):void;
    rmdir(path:string):Promise<any>;
    moveFile(originalPath:string,copyPath:string):void;
    readFile(file:string):Promise<string>;
    removeFile(file:string):Promise<void>;
    unzipFile(file:string,extractToDirectoryPath:string):void;
    listAllFile(dir: string, outFiles: string[]): Promise<void>
    /**
     * 异常返回错误信息，正常返回空字符串
     * @param file 
     * @param data 
     */
    writeFile(file:string,data:string):Promise<string>;
}