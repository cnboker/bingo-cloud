import { IFilePersistHandler } from "../interfaces/IFilePersistHandler";
import axios, { AxiosResponse, AxiosError } from "axios";
import { FileInfo } from "../dataModels/ContentPackage";

const logger = require("../logger");

export default class NodeFilePersistHandler implements IFilePersistHandler {
  listAllFile(dir: string, outFiles: string[]): Promise<void> {
    throw new Error("Method not implemented.");
  }
  copyFile(originalPath: string, copyPath: string): Promise<any> {
    if (originalPath.indexOf("http://") != -1) {
      return this.copyFileFromReomte(originalPath, copyPath);
    }

    return new Promise((resolve, reject) => {
      originalPath = process.env.ROOT + originalPath;
      copyPath = process.env.ROOT + copyPath;
      const fs = require("fs");
      if (!fs.existsSync(copyPath)) {
        fs.mkdirSync(copyPath, { recursive: true });
      }

      // createReadStream & createWriteStream
      var inputFile = fs.createReadStream(originalPath);
      var outputFile = fs.createWriteStream(copyPath);

      // Error handling
      inputFile.on("error", function(err: string) {
        console.log(err);
        logger.info("copyFile", err);
      });

      outputFile.on("error", function(err: string) {
        console.log(err);
        logger.info("copyFile", err);
      });

      // Do copy & End event
      inputFile.pipe(outputFile).on("close", function(err: string) {
        if (err) {
          reject(err);
        } else {
          resolve(outputFile);
        }
      });
    });
  }

  copyFileFromReomte(originalPath: string, copyPath: string): Promise<any> {
    return new Promise((resolve, reject) => {
      var fs = require("fs");
      var path = require("path");
      var file = path.join(process.env.ROOT, copyPath);
      var dir = path.dirname(file);
      //console.log('dir-file', dir, file)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      if (fs.existsSync(file)) {
        return;
      }
      axios({
        url: originalPath,
        method: "get",
        responseType: "stream"
      })
        .then((res: AxiosResponse) => {
          res.data.pipe(fs.createWriteStream(file));
          resolve("success");
        })
        .catch((err: AxiosError) => {
          logger.info(err.message);
          reject(err);
        });
    });
  }

  exists(path: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      path = process.env.ROOT + path;
      const fs = require("fs");
      var exist = fs.existsSync(path);
      resolve(exist);
    });
  }

  listFiles(): Promise<FileInfo[]> {
    throw new Error("not implemented");
    // var dir = process.env.ROOT;
    // const fs = require('fs');
    // var files = fs.readdirSync(dir);
    // var filelist:Array<string> = [];
    // var self = this;
    // files.forEach(function (file: string) {
    //     if (fs.statSync(dir + file).isDirectory()) {
    //         filelist = self.listFiles(dir + file + '/', filelist);
    //     }
    //     else {
    //         filelist.push(file);
    //     }
    // });
    // return filelist;
  }

  mkdir(path: string): void {
    path = process.env.ROOT + path;
    const fs = require("fs");
    fs.mkdir(path, function(err: string) {
      if (err) {
        logger.info("mkdir ERROR", err);
      }
    });
  }

  rmdir(path: string): Promise<any> {
    throw new Error("Method not implemented.");
    // path = process.env.ROOT + path;
    // const fs = require("fs");
    // fs.rmdir(path, function(err: string) {
    //   if (err) {
    //     logger.info("rmdir ERROR", err);
    //   }
    // });
  }

  moveFile(originalPath: string, destinationPath: string): void {
    originalPath = process.env.ROOT + originalPath;
    destinationPath = process.env.ROOT + destinationPath;
    const fs = require("fs");
    fs.rename(originalPath, destinationPath, function(err: string) {
      if (err) {
        logger.info("rename ERROR", err);
      }
    });
  }

  readFile(file: string): Promise<string> {
    var path = process.env.ROOT + file;
    const fs = require("fs");
    var text = fs.readFileSync(path, 'utf8');
    return Promise.resolve(text);
  }

  removeFile(file: string): Promise<void> {
    throw new Error("Method not implemented.");
    // var path = process.env.ROOT + file;
    // const fs = require("fs");
    // fs.unlink(path, function(err: string) {
    //   if (err) {
    //     logger.info("removeFile ERROR", err);
    //   }
    // });
  }

  unzipFile(zipFilePath: string, extractToDirectoryPath: string): void {
    zipFilePath = process.env.ROOT + zipFilePath;
    extractToDirectoryPath = process.env.ROOT + extractToDirectoryPath;
    const fs = require("fs");
    // createReadStream
    var readStream = fs.createReadStream(zipFilePath);

    // Error handling
    readStream.on("error", function(err: string) {
      logger.info("unzipFile createReadStream ERROR", err);
    });
    var unzip = require("unzip");

    // Do unzip & End event
    readStream
      .pipe(
        unzip.Extract({
          path: extractToDirectoryPath
        })
      )
      .on("close", function(err: string) {
        if (err) {
          logger.info("unzipFile Extract ERROR ERROR", err);
        }
      });
  }

  writeFile(file: string, data: string): Promise<string> {
    return new Promise((resolve, reject) => {
      file = process.env.ROOT + file;
      const fs = require("fs");
      fs.writeFile(file, data, 'utf8', function(err: string) {
        if (err) {
          logger.info("writeFile ERROR", err);
          reject();
        } else {
          resolve(err);
        }
      });
    });
  }
}
