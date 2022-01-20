/*
sourceUrl:target Url to download
return: ticket(Unique download ID, It can be usedto get more information about a specific download)
referece: https://www.webosose.org/docs/reference/ls2-api/com-webos-service-downloadmanager/#download
*/

import { clearInterval, setInterval } from "timers";

interface downloadResult {
  ticket: string,
  amountReceived: number,
  amountTotal: number,
  completed: boolean
}

/*
File name to use when saving the downloaded file.

If targetFilename is not specified, the file name specified in target is default. 
If there is the same file name, download manager will internally generate a unique name.
*/
export const download = (
  sourceUrl: string,
  targetDir: string, //Directory where to save the downloaded file.
  targetFilename: string,
  authToken: string,
): Promise<number> => {
  return new Promise((resolve, reject) => {
    //@ts-ignore
    var bridge = window.webosBridge;
    bridge.onservicecallback = (msg: string) => {
      var response = JSON.parse(msg);
      const {
        returnValue,
        errorCode,
        errorText,
        ticket
      } = response
      //console.log("download", response);
      if (!returnValue) {
        reject({ errorCode, errorText });
      } else {
        resolve(ticket)
      }
    };

    var url = "luna://com.webos.service.downloadmanager/download";
    var params = JSON.stringify({
      target: sourceUrl,
      authToken,
      targetDir,
      targetFilename,
      subscribe: true
    });
    bridge.call(url, params);
  });
}

export const downloadStatusQuery = (
  ticket: number,
): Promise<downloadResult> => {
  return new Promise((resolve, reject) => {
    //@ts-ignore
    var bridge = window.webosBridge;
    bridge.onservicecallback = (msg: string) => {
      var response = JSON.parse(msg);
      const {
        returnValue,
        errorCode,
        errorText,
        ticket,
        amountReceived,
        amountTotal,
        completed
      } = response
      console.log("downloadStatusQuery", response);
      if (returnValue) {
        resolve({ ticket, amountReceived, amountTotal, completed });
      }
      else if (returnValue === false) {
        reject({ errorCode, errorText });
      }
    };
    var url = "luna://com.webos.service.downloadmanager/downloadStatusQuery";
    var params = JSON.stringify({
      ticket,
      subscribe: true
    });
    bridge.call(url, params);
  });
}