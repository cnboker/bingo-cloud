// /service/service.js

// File I/O Service
// A webOS service sample using Node.js fs, crypto and unzip library functions
var Service = require("webos-service");
var service = new Service("com.lg.app.signage.fileservice");

var crypto = require("crypto");
var fs = require("fs");
var unzip = require("unzip");

var ROOT = "/media/internal";


// copyFile
service.register("copyFile", function(message) {
  var originalPath = ROOT + message.payload.originalPath;
  var copyPath = ROOT + message.payload.copyPath;

  // createReadStream & createWriteStream
  var inputFile = fs.createReadStream(originalPath);
  var outputFile = fs.createWriteStream(copyPath);

  // Error handling
  inputFile.on("error", function(err) {
    message.respond({
      returnValue: false,
      errorCode: "copyFile createReadStream ERROR",
      errorText: err
    });
  });

  outputFile.on("error", function(err) {
    message.respond({
      returnValue: false,
      errorCode: "copyFile createWriteStream ERROR",
      errorText: err
    });
  });

  // Do copy & End event
  inputFile.pipe(outputFile).on("close", function(err) {
    if (err) {
      message.respond({
        returnValue: false,
        errorCode: "copyFile createWriteStream ERROR",
        errorText: err
      });
    } else {
      message.respond({
        returnValue: true
      });
    }
  });
});

// exists
service.register("exists", function(message) {
  var path = ROOT + message.payload.path;

  fs.exists(path, function(exists) {
    if (!exists) {
      message.respond({
        returnValue: false,
        errorCode: "exists ERROR",
        errorText: "Not found"
      });
    } else {
      message.respond({
        returnValue: true,
        exists: exists
      });
    }
  });
});

// listFiles
service.register("listFiles", function(message) {
  var path = ROOT + message.payload.path;

  fs.readdir(path, function(err, files) {
    if (err) {
      message.respond({
        returnValue: false,
        errorCode: "listFiles ERROR",
        errorText: err
      });
    } else {
      message.respond({
        returnValue: true,
        files: files
      });
    }
  });
});

// mkdir
service.register("mkdir", function(message) {
  var path = ROOT + message.payload.path;
  console.log("path", path);
  fs.mkdir(path, function(err) {
    if (err) {
      message.respond({
        returnValue: false,
        errorCode: "mkdir ERROR",
        errorText: err
      });
    } else {
      message.respond({
        returnValue: true
      });
    }
  });
});

// rmdir
service.register("rmdir", function(message) {
  var path = ROOT + message.payload.path;

  fs.rmdir(path, function(err) {
    if (err) {
      message.respond({
        returnValue: false,
        errorCode: "rmdir ERROR",
        errorText: err
      });
    } else {
      message.respond({
        returnValue: true
      });
    }
  });
});

// moveFile
service.register("moveFile", function(message) {
  var originalPath = ROOT + message.payload.originalPath;
  var destinationPath = ROOT + message.payload.destinationPath;

  fs.rename(originalPath, destinationPath, function(err) {
    if (err) {
      message.respond({
        returnValue: false,
        errorCode: "rename ERROR",
        errorText: err
      });
    } else {
      message.respond({
        returnValue: true
      });
    }
  });
});

// readFile
service.register("readFile", function(message) {
  var path = ROOT + message.payload.path;
  var encoding = message.payload.encoding;

  fs.readFile(path, encoding, function(err, data) {
    if (err) {
      message.respond({
        returnValue: false,
        errorCode: "readFile ERROR",
        errorText: err
      });
    } else {
      message.respond({
        returnValue: true,
        data: data
      });
    }
  });
});

// removeFile
service.register("removeFile", function(message) {
  var path = ROOT + message.payload.path;

  fs.unlink(path, function(err) {
    if (err) {
      message.respond({
        returnValue: false,
        errorCode: "removeFile ERROR",
        errorText: err
      });
    } else {
      message.respond({
        returnValue: true
      });
    }
  });
});

// unzipFile
service.register("unzipFile", function(message) {
  var zipFilePath = ROOT + message.payload.zipFilePath;
  var extractToDirectoryPath = ROOT + message.payload.extractToDirectoryPath;

  // createReadStream
  var readStream = fs.createReadStream(zipFilePath);

  // Error handling
  readStream.on("error", function(err) {
    message.respond({
      returnValue: false,
      errorCode: "unzipFile createReadStream ERROR",
      errorText: err
    });
  });

  // Do unzip & End event
  readStream
    .pipe(
      unzip.Extract({
        path: extractToDirectoryPath
      })
    )
    .on("close", function(err) {
      if (err) {
        message.respond({
          returnValue: false,
          errorCode: "unzipFile Extract ERROR",
          errorText: err
        });
      } else {
        message.respond({
          returnValue: true
        });
      }
    });
});

// writeFile
service.register("writeFile", function(message) {
  var path = ROOT + message.payload.path;
  var data = message.payload.data;
  var encoding = message.payload.encoding;

  fs.writeFile(path, data, encoding, function(err) {
    if (err) {
      message.respond({
        returnValue: false,
        errorCode: "writeFile ERROR",
        errorText: err
      });
    } else {
      message.respond({
        returnValue: true
      });
    }
  });
});

// MD5
service.register("MD5", function(message) {
  var path = ROOT + message.payload.path;
  var algorithm = message.payload.algorithm;

  // createHash
  var MD5 = crypto.createHash(algorithm);

  // createReadStream
  var readStream = fs.createReadStream(path);

  // Error handling
  MD5.on("error", function(err) {
    message.respond({
      returnValue: false,
      errorCode: "MD5 update ERROR",
      errorText: err
    });
  });

  readStream.on("error", function(err) {
    message.respond({
      returnValue: false,
      errorCode: "MD5 createReadStream ERROR",
      errorText: err
    });
  });

  // Do SHA 256 hash
  readStream.on("data", function(dataStream) {
    MD5.update(dataStream);
  });

  readStream.on("close", function(err) {
    var output = MD5.digest("base64");

    if (err) {
      message.respond({
        returnValue: false,
        errorCode: "MD5 digest ERROR",
        errorText: err
      });
    } else {
      message.respond({
        returnValue: true,
        output: output
      });
    }
  });
});

// SHA256
service.register("SHA256", function(message) {
  var path = ROOT + message.payload.path;
  var algorithm = message.payload.algorithm;

  // createHash
  var sha256 = crypto.createHash(algorithm);

  // createReadStream
  var readStream = fs.createReadStream(path);

  // Error handling
  sha256.on("error", function(err) {
    message.respond({
      returnValue: false,
      errorCode: "SHA256 update ERROR",
      errorText: err
    });
  });

  readStream.on("error", function(err) {
    message.respond({
      returnValue: false,
      errorCode: "SHA256 createReadStream ERROR",
      errorText: err
    });
  });

  // Do SHA 256 hash
  readStream.on("data", function(dataStream) {
    sha256.update(dataStream);
  });

  readStream.on("close", function(err) {
    var output = sha256.digest("base64");

    if (err) {
      message.respond({
        returnValue: false,
        errorCode: "SHA256 digest ERROR",
        errorText: err
      });
    } else {
      message.respond({
        returnValue: true,
        output: output
      });
    }
  });
});

// AES256 encrypt - Ver.1
service.register("AES256Encrypt", function(message) {
  try {
    var algorithm = message.payload.algorithm;
    var password = message.payload.password;
    var inputPath = ROOT + message.payload.inputPath;
    var outputPath = ROOT + message.payload.outputPath;

    // Password hash generation
    password = crypto
      .createHash("sha256")
      .update(password)
      .digest("base64");

    // createReadStream & createWriteStream
    var inputCommend = fs.createReadStream(inputPath);
    var outputCommend = fs.createWriteStream(outputPath);

    var encrypt = crypto.createCipher(algorithm, password);

    // Error handling
    inputCommend.on("error", function(err) {
      message.respond({
        returnValue: false,
        errorCode: "AES256Encrypt createReadStream ERROR",
        errorText: err
      });
    });

    outputCommend.on("error", function(err) {
      message.respond({
        returnValue: false,
        errorCode: "AES256Encrypt createWriteStream ERROR",
        errorText: err
      });
    });

    encrypt.on("error", function(err) {
      message.respond({
        returnValue: false,
        errorCode: "AES256Encrypt createCipher ERROR",
        errorText: err
      });
    });

    // Do AES 256 decrypt & Ended event
    inputCommend
      .pipe(encrypt)
      .pipe(outputCommend)
      .on("close", function(err) {
        if (err) {
          message.respond({
            returnValue: false,
            errorCode: "AES256Encrypt createWriteStream ERROR",
            errorText: err
          });
        } else {
          message.respond({
            returnValue: true,
            returnText: "AES256Encrypt succeeded."
          });
        }
      });
  } catch (err) {
    message.respond({
      returnValue: false,
      errorCode: "AES256Encrypt ERROR",
      errorText: err.message
    });
  }
});

// AES256 decrypt - Ver.1
service.register("AES256Decrypt", function(message) {
  try {
    var algorithm = message.payload.algorithm;
    var password = message.payload.password;
    var inputPath = ROOT + message.payload.inputPath;
    var outputPath = ROOT + message.payload.outputPath;

    // Password hash generation
    password = crypto
      .createHash("sha256")
      .update(password)
      .digest("base64");

    // createReadStream & createWriteStream
    var inputCommend = fs.createReadStream(inputPath);
    var outputCommend = fs.createWriteStream(outputPath);

    var decrypt = crypto.createDecipher(algorithm, password);

    // Error handling
    inputCommend.on("error", function(err) {
      message.respond({
        returnValue: false,
        errorCode: "AES256Decrypt createReadStream ERROR",
        errorText: err
      });
    });

    outputCommend.on("error", function(err) {
      message.respond({
        returnValue: false,
        errorCode: "AES256Decrypt createWriteStream ERROR",
        errorText: err
      });
    });

    decrypt.on("error", function(err) {
      message.respond({
        returnValue: false,
        errorCode: "AES256Decrypt createDecipher ERROR",
        errorText: err
      });
    });

    // Do AES 256 decrypt & Ended event
    inputCommend
      .pipe(decrypt)
      .pipe(outputCommend)
      .on("close", function(err) {
        if (err) {
          message.respond({
            returnValue: false,
            errorCode: "AES256Decrypt createWriteStream ERROR",
            errorText: err
          });
        } else {
          message.respond({
            returnValue: true,
            returnText: "AES256Decrypt succeeded."
          });
        }
      });
  } catch (err) {
    message.respond({
      returnValue: false,
      errorCode: "AES256Decrypt ERROR",
      errorText: err.message
    });
  }
});

// AES256 encrypt - Ver.2
service.register("AES256EncryptCreateCipheriv", function(message) {
  try {
    var password = message.payload.password;
    var salt = message.payload.salt;
    var iterations = message.payload.iterations;
    var keylen = message.payload.keylen;
    var digest = message.payload.digest;

    var algorithm = message.payload.algorithm;
    var encryptInputPath = ROOT + message.payload.encryptInputPath;
    var encryptOutputPath = ROOT + message.payload.encryptOutputPath;
    var initializationVector = message.payload.initializationVector;

    // createReadStream & createWriteStream
    var encryptInput = fs.createReadStream(encryptInputPath);
    var encryptOutput = fs.createWriteStream(encryptOutputPath);

    // Error handling
    encryptInput.on("error", function(err) {
      message.respond({
        returnValue: false,
        errorCode: "AES256Encrypt createReadStream ERROR",
        errorText: err
      });
    });

    encryptOutput.on("error", function(err) {
      message.respond({
        returnValue: false,
        errorCode: "AES256Encrypt createWriteStream ERROR",
        errorText: err
      });
    });

    // Do crypto.pbkdf2 & Error event handling
    crypto.pbkdf2(password, salt, iterations, keylen, digest, function(
      err,
      derivedKey
    ) {
      var cipher = crypto.createCipheriv(
        algorithm,
        derivedKey,
        initializationVector
      );

      // Error handling
      cipher.on("error", function(err) {
        message.respond({
          returnValue: false,
          errorCode: "AES256Encrypt createCipheriv ERROR",
          errorText: err
        });
      });

      // Do AES256 encrypt & Ended event
      encryptInput
        .pipe(cipher)
        .pipe(encryptOutput)
        .on("close", function(err) {
          if (err) {
            message.respond({
              returnValue: false,
              errorCode: "AES256Encrypt ERROR",
              errorText: err
            });
          } else {
            message.respond({
              returnValue: true,
              returnText: "AES256Encrypt succeeded."
            });
          }
        });
    });
  } catch (err) {
    message.respond({
      returnValue: false,
      errorCode: "AES256Encrypt ERROR",
      errorText: err.message
    });
  }
});

// AES256 decrypt - Ver.2
service.register("AES256DecryptCreateDecipheriv", function(message) {
  try {
    var password = message.payload.password;
    var salt = message.payload.salt;
    var iterations = message.payload.iterations;
    var keylen = message.payload.keylen;
    var digest = message.payload.digest;

    var algorithm = message.payload.algorithm;
    var decryptInputPath = ROOT + message.payload.decryptInputPath;
    var decryptOutputPath = ROOT + message.payload.decryptOutputPath;
    var initializationVector = message.payload.initializationVector;

    // createReadStream & createWriteStream
    var decryptInput = fs.createReadStream(decryptInputPath);
    var decryptOutput = fs.createWriteStream(decryptOutputPath);

    // Error handling
    decryptInput.on("error", function(err) {
      message.respond({
        returnValue: false,
        errorCode: "AES256Decrypt createReadStream ERROR",
        errorText: err
      });
    });

    decryptOutput.on("error", function(err) {
      message.respond({
        returnValue: false,
        errorCode: "AES256Decrypt createWriteStream ERROR",
        errorText: err
      });
    });

    // Do crypto.pbkdf2 & Error event handling
    crypto.pbkdf2(password, salt, iterations, keylen, digest, function(
      err,
      derivedKey
    ) {
      var decipher = crypto.createDecipheriv(
        algorithm,
        derivedKey,
        initializationVector
      );

      // Error handling
      decipher.on("error", function(err) {
        message.respond({
          returnValue: false,
          errorCode: "AES256Decrypt createDecipheriv ERROR",
          errorText: err
        });
      });

      // Do AES256 decrypt & Ended event
      decryptInput
        .pipe(decipher)
        .pipe(decryptOutput)
        .on("close", function(err) {
          if (err) {
            message.respond({
              returnValue: false,
              errorCode: "AES256Decrypt ERROR",
              errorText: err
            });
          } else {
            message.respond({
              returnValue: true,
              returnText: "AES256Decrypt succeeded."
            });
          }
        });
    });
  } catch (err) {
    message.respond({
      returnValue: false,
      errorCode: "AES256Decrypt ERROR",
      errorText: err.message
    });
  }
});
