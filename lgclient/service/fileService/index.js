// note: The JS service must be packaged along with the app.
// File I/O Service
// A webOS service sample using Node.js fs, crypto and unzip library functions
/*
If the JS service uses methods of external services, 
you must add the group information of the external methods to the requiredPermissions field in appinfo.json
 of the app used for packaging the JS service. See Configuring the Web App for details.
*/
//package.json->externals->ignore compile like @ts-ignore
//require npm install parcel-plugin-externals
//如果出现app无法安装的情况， 主要原因就是js-service代码无法执行引起，可以通过
//journalctl -S "1 hour ago"
//命令查看导致代码无法执行的原因， 远程到/media/developer/apps/usr/plams目录定位类似一下错误，先远程修复，再重新安装
/*
Oct 17 18:06:10 raspberrypi4 ls-hubd[1534]: ReferenceError: webos is not defined
Oct 17 18:06:10 raspberrypi4 ls-hubd[1534]:     at Object.159 (/media/developer/apps/usr/palm/services/com.ioliz.dc.app.fileservice/index.js:24:18)
Oct 17 18:06:10 raspberrypi4 ls-hubd[1534]:     at __webpack_require__ (/media/developer/apps/usr/palm/services/com.ioliz.dc.app.fileservice/index.js:56:41)
Oct 17 18:06:10 raspberrypi4 ls-hubd[1534]:     at /media/developer/apps/usr/palm/services/com.ioliz.dc.app.fileservice/index.js:76:17
Oct 17 18:06:10 raspberrypi4 ls-hubd[1534]:     at /media/developer/apps/usr/palm/services/com.ioliz.dc.app.fileservice/index.js:266:3
Oct 17 18:06:10 raspberrypi4 ls-hubd[1534]:     at Object.<anonymous> (/media/developer/apps/usr/palm/services/com.ioliz.dc.app.fileservice/index.js:268:12)
Oct 17 18:06:10 raspberrypi4 ls-hubd[1534]:     at Module._compile (internal/modules/cjs/loader.js:999:30)
Oct 17 18:06:10 raspberrypi4 ls-hubd[1534]:     at Object.Module._extensions..js (internal/modules/cjs/loader.js:1027:10)
Oct 17 18:06:10 raspberrypi4 ls-hubd[1534]:     at Module.load (internal/modules/cjs/loader.js:863:32)
Oct 17 18:06:10 raspberrypi4 ls-hubd[1534]:     at Function.Module._load (internal/modules/cjs/loader.js:708:14)
Oct 17 18:06:10 raspberrypi4 ls-hubd[1534]:     at Module.require (internal/modules/cjs/loader.js:887:19)
*/
const Service = require("webos-service");
const pkgInfo = require("./package.json");
const service = new Service(pkgInfo.name);
service.activityManager.idleTimeout = 5;

//const crypto = require("crypto");
const fs = require("fs");

// copyFile
service.register("copyFile", function (message) {
  var originalPath = message.payload.originalPath;
  var copyPath = message.payload.copyPath;

  // createReadStream & createWriteStream
  var inputFile = fs.createReadStream(originalPath);
  var outputFile = fs.createWriteStream(copyPath);

  // Error handling
  inputFile.on("error", function (err) {
    message.respond({
      returnValue: false,
      errorCode: "copyFile createReadStream ERROR",
      errorText: err,
    });
  });

  outputFile.on("error", function (err) {
    message.respond({
      returnValue: false,
      errorCode: "copyFile createWriteStream ERROR",
      errorText: err,
    });
  });

  // Do copy & End event
  inputFile.pipe(outputFile).on("close", function (err) {
    if (err) {
      message.respond({
        returnValue: false,
        errorCode: "copyFile createWriteStream ERROR",
        errorText: err,
      });
    } else {
      message.respond({
        returnValue: true,
      });
    }
  });
});

// exists
service.register("exists", function (message) {
  var path = message.payload.path;
  let exists = false;
  try {
    if (fs.existsSync(path)) {
      console.log("The file exists.");
      exists = true;
    }
  } catch (err) {
    console.error(err);
  }

  message.respond({
    returnValue: exists,
  });
});

// listFiles
service.register("listFiles", function (message) {
  var path = message.payload.path;

  fs.readdir(path, function (err, files) {
    if (err) {
      message.respond({
        returnValue: false,
        errorCode: "listFiles ERROR",
        errorText: err,
      });
    } else {
      message.respond({
        returnValue: true,
        files: files,
      });
    }
  });
});

// mkdir
service.register("mkdir", function (message) {
  var path = message.payload.path;
  console.log("path", path);
  fs.mkdir(path, function (err) {
    if (err) {
      message.respond({
        returnValue: false,
        errorCode: "mkdir ERROR",
        errorText: err,
      });
    } else {
      message.respond({
        returnValue: true,
      });
    }
  });
});

// rmdir
service.register("rmdir", function (message) {
  var path = message.payload.path;

  fs.rmdir(path, function (err) {
    if (err) {
      message.respond({
        returnValue: false,
        errorCode: "rmdir ERROR",
        errorText: err,
      });
    } else {
      message.respond({
        returnValue: true,
      });
    }
  });
});

// moveFile
service.register("moveFile", function (message) {
  var originalPath = message.payload.originalPath;
  var destinationPath = message.payload.destinationPath;

  fs.rename(originalPath, destinationPath, function (err) {
    if (err) {
      message.respond({
        returnValue: false,
        errorCode: "rename ERROR",
        errorText: err,
      });
    } else {
      message.respond({
        returnValue: true,
      });
    }
  });
});

// readFile
service.register("readFile", function (message) {
  var path = message.payload.path;
  var encoding = message.payload.encoding;

  fs.readFile(path, encoding, function (err, data) {
    if (err) {
      message.respond({
        returnValue: false,
        errorCode: "readFile ERROR",
        errorText: err,
      });
    } else {
      message.respond({
        returnValue: true,
        data: data,
      });
    }
  });
});

// removeFile
service.register("removeFile", function (message) {
  var path = message.payload.path;

  fs.unlink(path, function (err) {
    if (err) {
      message.respond({
        returnValue: false,
        errorCode: "removeFile ERROR",
        errorText: err,
      });
    } else {
      message.respond({
        returnValue: true,
      });
    }
  });
});

// unzipFile
service.register("unzipFile", function (message) {
  const unzip = require("unzip");

  var zipFilePath = message.payload.zipFilePath;
  var extractToDirectoryPath = message.payload.extractToDirectoryPath;

  // createReadStream
  var readStream = fs.createReadStream(zipFilePath);

  // Error handling
  readStream.on("error", function (err) {
    message.respond({
      returnValue: false,
      errorCode: "unzipFile createReadStream ERROR",
      errorText: err,
    });
  });

  // Do unzip & End event
  readStream
    .pipe(
      unzip.Extract({
        path: extractToDirectoryPath,
      })
    )
    .on("close", function (err) {
      if (err) {
        message.respond({
          returnValue: false,
          errorCode: "unzipFile Extract ERROR",
          errorText: err,
        });
      } else {
        message.respond({
          returnValue: true,
        });
      }
    });
});

// writeFile
service.register("writeFile", function (message) {
  const { path, data } = message.payload;

  fs.writeFile(path, data, function (err) {
    if (err) {
      message.respond({
        returnValue: false,
        errorCode: "writeFile ERROR",
        errorText: err,
      });
    } else {
      message.respond({
        returnValue: true,
      });
    }
  });
});
