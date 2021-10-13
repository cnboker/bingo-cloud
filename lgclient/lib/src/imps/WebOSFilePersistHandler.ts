import { IFilePersistHandler } from "../interfaces/IFilePersistHandler";
import { USB_ROOT, DS_FILE_ROOT } from "../config";
import { safeUrl } from "./util";
import { ProgressResult, downloadProcess } from "./downloadProgress";

export default class WebOSFilePersistHandler implements IFilePersistHandler {
  copyFile(
    originalPath: string,
    copyPath: string,
    cbProgress?: (progressResult: ProgressResult) => void
  ): Promise<any> {
    var _url = safeUrl(copyPath);
    return new Promise((resolve, reject) => {
      var successCb = function () {
        console.log("Copying File done.");
        // configInstance.emitter.emit(
        //   "log",
        //   EventType.FileDownload,
        //   "file download success"
        // );
        resolve(`${DS_FILE_ROOT}${_url}`);
      };
      var failureCb = function (cbObject: any) {
        var errorCode = cbObject.errorCode;
        var errorText = cbObject.errorText;
        console.log(" Error Code [" + errorCode + "]: " + errorText);
        reject(cbObject);
      };
      var index = originalPath.lastIndexOf("/");
      var path = originalPath.substr(0, index);
      var file = originalPath.substr(index + 1);
      var options = {
        source: path + "/" + encodeURIComponent(file),
        destination: `${DS_FILE_ROOT}${_url}`
      };
      if (cbProgress) {
        downloadProcess(options.source, options.destination, cbProgress);
      }
      console.log("copy_options_remote_to_local", options);
      // @ts-ignore : 编译忽略window.Storage对象
      var storage = new window.Storage();
      // @ts-ignore
      storage.copyFile(successCb, failureCb, options);

    });
  }
  exists(path: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      var successCb = function (cbObject: any) {
        var exists = cbObject.exists;
        //console.log("The file exists: " + exists);
        resolve(cbObject.exists);
      };
      var failureCb = function (cbObject: any) {
        var errorCode = cbObject.errorCode;
        var errorText = cbObject.errorText;
        console.log(" Error Code [" + errorCode + "]: " + errorText);
        reject(cbObject);
      };
      var options = { path: `${DS_FILE_ROOT}${safeUrl(path)}` };
      if (path.indexOf(USB_ROOT) !== -1) {
        options = { path };
      }
      // @ts-ignore
      var storage = new window.Storage();
      //console.log('file exists options=',options)
      storage.exists(successCb, failureCb, options);
    });
  }
  listFiles(dir?: string): Promise<any> {
    return new Promise((resolve, reject) => {
      var success = function (cbObject: any) {
        // console.log("listFiles SUCCESS: " + cbObject);
        resolve(cbObject);
      };
      var failure = function () {
        console.log("ERROR,listFiles call error");
        reject("listFiles call error");
      };
      var options = { path: DS_FILE_ROOT };
      if (dir) {
        if (dir.indexOf(USB_ROOT) !== -1) {
          options = { path: dir };
        } else {
          options = { path: `${DS_FILE_ROOT}${dir}` };
        }
      }
      //console.log("listFiles options=", options);
      // @ts-ignore
      new window.Storage().listFiles(success, failure, options);
    });
  }
  mkdir(path: string): void {
    var options = { path: `${DS_FILE_ROOT}${path}` };
    if (path.indexOf(USB_ROOT) !== -1) {
      options = { path };
    }
    var successCb = function (cbObject: any) {
      console.log("A directory is created successfully.");
    };
    var failureCb = function (cbObject: any) {
      var errorCode = cbObject.errorCode;
      var errorText = cbObject.errorText;
      console.log(" Error Code [" + errorCode + "]: " + errorText);
    };
    // @ts-ignore
    new window.Storage().mkdir(successCb, failureCb, options);
  }
  rmdir(path: string): Promise<any> {
    return new Promise((resolve, reject) => {
      // Callback for a successful execution.
      // This callback will be called without any parameter.
      var successCb = function () {
        console.log("Removing File done.");
        resolve("success");
      };
      // Callback for a failed execution.
      // Failure callback will be invoked with the error code and the error text.
      var failureCb = function (cbObject: any) {
        var errorCode = cbObject.errorCode;
        var errorText = cbObject.errorText;
        console.log(" Error Code [" + errorCode + "]: " + errorText);
        reject(" Error Code [" + errorCode + "]: " + errorText);
      };
      var options = {
        file: path,
        recursive: true
      };
      //@ts-ignore
      var storage = new Storage();
      // @ts-ignore
      storage.removeFile(successCb, failureCb, options);
    });
  }
  moveFile(originalPath: string, copyPath: string): void {
    throw new Error("Method not implemented.");
  }
  readFile(file: string): Promise<string> {
    return new Promise((resolve, reject) => {
      var successCb = function (cbObject: any) {
        resolve(cbObject.data);
      };
      var failureCb = function (cbObject: any) {
        var errorCode = cbObject.errorCode;
        var errorText = cbObject.errorText;
        console.log(
          "readFile Error Code [" + errorCode + "]: " + errorText + "," + file
        );
        reject(" Error Code [" + errorCode + "]: " + errorText);
      };
      var spliter = "/";
      if (file[0] === "/") {
        spliter = "";
      }
      // Read the whole file from the beginning, as a text file.
      var options = {
        //path: "file://internal/text.txt",
        path: `${DS_FILE_ROOT}${spliter}${file}`,
        position: 0,
        encoding: "utf8"
      };
      //@ts-ignore
      var storage = new Storage();
      //@ts-ignore
      storage.readFile(successCb, failureCb, options);
    });
  }
  removeFile(file: string): Promise<void> {
    return new Promise((resolve, reject) => {
      var successCb = function () {
        console.log("Removing File done." + options.file);
        resolve();
      };
      var failureCb = function (cbObject: any) {
        var errorCode = cbObject.errorCode;
        var errorText = cbObject.errorText;
        console.log("removeFile Error Code [" + errorCode + "]: " + options.file);
        reject();
      };
      var spliter = "/";
      if (file[0] === "/") {
        spliter = "";
      }
      // Delete a file
      var options = {
        file: `${DS_FILE_ROOT}${spliter}${(file)}`
      };
      //@ts-ignore
      var storage = new Storage();
      //@ts-ignore
      storage.removeFile(successCb, failureCb, options);
    })

  }
  unzipFile(file: string, extractToDirectoryPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      var successCb = function () {
        console.log("Unzip File successful");
        resolve();
      };
      var failureCb = function (cbObject: any) {
        var errorCode = cbObject.errorCode;
        var errorText = cbObject.errorText;
        var err = " Error Code [" + errorCode + "]: " + errorText;
        console.log(err);
        reject(err);
      };
      var options = {
        zipPath: file,
        targetPath: extractToDirectoryPath
      };
      //@ts-ignore
      var storage = new Storage();
      //@ts-ignore
      storage.unzipFile(successCb, failureCb, options);
    });
  }
  //文件大小不能超过10K,如果需要写大文件这里需要循环写文件
  writeFile(file: string, data: string): Promise<string> {
    return new Promise((resolve, reject) => {
      var successCb = function (cbObject: any) {
        console.log(
          "Successfully writen " + file + "," + cbObject.written + " bytes"
        );
        resolve('success');
      };
      var failureCb = function (cbObject: any) {
        var errorCode = cbObject.errorCode;
        var errorText = cbObject.errorText;
        console.log(
          "writeFile Error Code [" + errorCode + "]: " + errorText + "," + file
        );
        reject(" Error Code [" + errorCode + "]: " + errorText);
      };
      // Write Text data, use utf-8 encoding, write all text.
      var spliter = "/";
      if (file[0] === "/") {
        spliter = "";
      }
      var options = {
        data,
        path: `${DS_FILE_ROOT}${spliter}${file}`,
        position: 0,
        mode: "truncate",
        offset: 0,
        length: data.length,
        encoding: "utf8"
      };
      console.log("write file options", options);
      // @ts-ignore
      var storage = new window.Storage();
      // @ts-ignore
      storage.writeFile(successCb, failureCb, options);
    });
  }
  async listAllFile(dir: string, outFiles: string[]): Promise<void> {
    var fileInfos = await this.listFiles(dir);
    console.log("fileinfos", fileInfos);
    var files = fileInfos.files
      .filter((x: any) => {
        return x.type === "file";
      })
      .map((x: any) => {
        return `${dir}/${x.name}`;
      });
    outFiles.push(...files);
    var dirs = fileInfos.files
      .filter((x: any) => {
        return x.type === "folder";
      })
      .map((x: any) => {
        return `${dir}/${x.name}`;
      });
    for (var subDir of dirs) {
      await this.listAllFile(subDir, outFiles);
    }
  }
}
