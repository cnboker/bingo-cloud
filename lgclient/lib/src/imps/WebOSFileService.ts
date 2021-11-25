export function exists(path: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    //@ts-ignore
    var bridge = window.webosBridge;
    bridge.onservicecallback = (msg: string) => {
      var response = JSON.parse(msg);
      console.log('exists response', response)
      const { returnValue } = response;
      resolve(returnValue)
    }
    var url = "luna://com.ioliz.dc.app.fileservice/exists";
    var params = JSON.stringify({ path });
    bridge.call(url, params)
  })
}

export function listFiles(path: string): Promise<any> {
  return new Promise((resolve, reject) => {
    //@ts-ignore
    var bridge = window.webosBridge;
    bridge.onservicecallback = (msg: string) => {
      var response = JSON.parse(msg);
      const { returnValue, errorText, files } = response;
      if (returnValue) {
        resolve(files);
      } else {
        reject(errorText);
      }
    }
    var url = "luna://com.ioliz.dc.app.fileservice/listFiles";
    var params = JSON.stringify({ path });
    bridge.call(url, params)
  })
}

export function mkdir(path: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    //@ts-ignore
    var bridge = window.webosBridge;
    bridge.onservicecallback = (msg: string) => {
      var response = JSON.parse(msg);
      const { returnValue, errorText } = response;
      if (returnValue) {
        resolve(returnValue);
      } else {
        reject(errorText);
      }
    }
    var url = "luna://com.ioliz.dc.app.fileservice/mkdir";
    var params = JSON.stringify({ path });
    bridge.call(url, params)
  })
}

export function rmdir(path: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    //@ts-ignore
    var bridge = window.webosBridge;
    bridge.onservicecallback = (msg: string) => {
      var response = JSON.parse(msg);
      const { returnValue, errorText, files } = response;
      if (returnValue) {
        resolve(files);
      } else {
        reject(errorText);
      }
    }
    var url = "luna://com.ioliz.dc.app.fileservice/rmdir";
    var params = JSON.stringify({ path });
    bridge.call(url, params)
  })
}

export function moveFile(originalPath: string, destinationPath: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    //@ts-ignore
    var bridge = window.webosBridge;
    bridge.onservicecallback = (msg: string) => {
      var response = JSON.parse(msg);
      const { returnValue, errorText, files } = response;
      if (returnValue) {
        resolve(files);
      } else {
        reject(errorText);
      }
    }
    var url = "luna://com.ioliz.dc.app.fileservice/moveFile";
    var params = JSON.stringify({ originalPath, destinationPath });
    bridge.call(url, params)
  })
}

export function readFile(path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    //@ts-ignore
    var bridge = window.webosBridge;
    bridge.onservicecallback = (msg: string) => {
      var response = JSON.parse(msg);
      const { returnValue, errorText, data } = response;
      if (returnValue) {
        resolve(data);
      } else {
        reject(errorText);
      }
    }
    var url = "luna://com.ioliz.dc.app.fileservice/readFile";
    var params = JSON.stringify({ path, encoding: 'utf-8' });
    bridge.call(url, params)
  })
}

export function removeFile(path: string): Promise<void> {
  return new Promise((resolve, reject) => {
    //@ts-ignore
    var bridge = window.webosBridge;
    bridge.onservicecallback = (msg: string) => {
      var response = JSON.parse(msg);
      const { returnValue, errorText } = response;
      if (returnValue) {
        resolve(returnValue);
      } else {
        reject(errorText);
      }
    }
    var url = "luna://com.ioliz.dc.app.fileservice/removeFile";
    var params = JSON.stringify({ path });
    bridge.call(url, params)
  })
}

export function unzipFile(zipFilePath: string, extractToDirectoryPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    //@ts-ignore
    var bridge = window.webosBridge;
    bridge.onservicecallback = (msg: string) => {
      var response = JSON.parse(msg);
      const { returnValue, errorText } = response;
      if (returnValue) {
        resolve(returnValue);
      } else {
        reject(errorText);
      }
    }
    var url = "luna://com.ioliz.dc.app.fileservice/unzipFile";
    var params = JSON.stringify({ zipFilePath, extractToDirectoryPath });
    bridge.call(url, params)
  })
}

//文件大小不能超过10K,如果需要写大文件这里需要循环写文件
export function writeFile(path: string, data: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    //@ts-ignore
    var bridge = window.webosBridge;
    bridge.onservicecallback = (msg: string) => {
      var response = JSON.parse(msg);
      const { returnValue, errorText } = response;
      if (returnValue) {
        resolve(returnValue);
      } else {
        reject(errorText);
      }
    }
    var url = "luna://com.ioliz.dc.app.fileservice/writeFile";
    var params = JSON.stringify({ path, data, encoding: 'utf-8' });
    bridge.call(url, params)
  })
}

export async function listAllFile(dir: string, outFiles: string[]): Promise<void> {
  var fileInfos = await listFiles(dir);
  var files = fileInfos
    .files
    .filter((x: any) => {
      return x.type === "file";
    })
    .map((x: any) => {
      return `${dir}/${x.name}`;
    });
  outFiles.push(...files);
  var dirs = fileInfos
    .files
    .filter((x: any) => {
      return x.type === "folder";
    })
    .map((x: any) => {
      return `${dir}/${x.name}`;
    });
  for (var subDir of dirs) {
    await listAllFile(subDir, outFiles);
  }
}

export function MD5(path: string, algorithm: string): Promise<string> {
  return new Promise((resolve, reject) => {
    //@ts-ignore
    var bridge = window.webosBridge;
    bridge.onservicecallback = (msg: string) => {
      var response = JSON.parse(msg);
      const { returnValue, errorText, output } = response;
      if (returnValue) {
        resolve(output);
      } else {
        reject(errorText);
      }
    }
    var url = "luna://com.ioliz.dc.app.fileservice/MD5";
    var params = JSON.stringify({ path, algorithm });
    bridge.call(url, params)
  })
}

export function SHA256(path: string, algorithm: string): Promise<string> {
  return new Promise((resolve, reject) => {
    //@ts-ignore
    var bridge = window.webosBridge;
    bridge.onservicecallback = (msg: string) => {
      var response = JSON.parse(msg);
      const { returnValue, errorText, output } = response;
      if (returnValue) {
        resolve(output);
      } else {
        reject(errorText);
      }
    }
    var url = "luna://com.ioliz.dc.app.fileservice/SHA256";
    var params = JSON.stringify({ path, algorithm });
    bridge.call(url, params)
  })
}

export function AES256Encrypt(algorithm: string, password: string, inputPath: string, outputPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    //@ts-ignore
    var bridge = window.webosBridge;
    bridge.onservicecallback = (msg: string) => {
      var response = JSON.parse(msg);
      const { returnValue, errorText, output } = response;
      if (returnValue) {
        resolve(output);
      } else {
        reject(errorText);
      }
    }
    var url = "luna://com.ioliz.dc.app.fileservice/AES256Encrypt";
    var params = JSON.stringify({ algorithm, password, inputPath, outputPath });
    bridge.call(url, params)
  })
}

export function AES256Decrypt(algorithm: string, password: string, inputPath: string, outputPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    //@ts-ignore
    var bridge = window.webosBridge;
    bridge.onservicecallback = (msg: string) => {
      var response = JSON.parse(msg);
      const { returnValue, errorText, output } = response;
      if (returnValue) {
        resolve(output);
      } else {
        reject(errorText);
      }
    }
    var url = "luna://com.ioliz.dc.app.fileservice/AES256Decrypt";
    var params = JSON.stringify({ algorithm, password, inputPath, outputPath });
    bridge.call(url, params)
  })
}


export function AES256EncryptCreateCipheriv(
  password: string,
  salt: string,
  iterations: string,
  keylen: string,
  digest: string,
  algorithm: string,
  inputPath: string,
  outputPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    //@ts-ignore
    var bridge = window.webosBridge;
    bridge.onservicecallback = (msg: string) => {
      var response = JSON.parse(msg);
      const { returnValue, errorText, output } = response;
      if (returnValue) {
        resolve(output);
      } else {
        reject(errorText);
      }
    }
    var url = "luna://com.ioliz.dc.app.fileservice/AES256EncryptCreateCipheriv";
    var params = JSON.stringify({ password, salt, iterations, keylen, digest, algorithm, inputPath, outputPath });
    bridge.call(url, params)
  })
}

// AES256 decrypt - Ver.2
export function AES256DecryptCreateDecipheriv(
  password: string,
  salt: string,
  iterations: string,
  keylen: string,
  digest: string,
  algorithm: string,
  inputPath: string,
  outputPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    //@ts-ignore
    var bridge = window.webosBridge;
    bridge.onservicecallback = (msg: string) => {
      var response = JSON.parse(msg);
      const { returnValue, errorText, output } = response;
      if (returnValue) {
        resolve(output);
      } else {
        reject(errorText);
      }
    }
    var url = "luna://com.ioliz.dc.app.fileservice/AES256DecryptCreateDecipheriv";
    var params = JSON.stringify({ password, salt, iterations, keylen, digest, algorithm, inputPath, outputPath });
    bridge.call(url, params)
  })
}
