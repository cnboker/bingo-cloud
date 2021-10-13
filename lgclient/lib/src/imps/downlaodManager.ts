/*
sourceUrl:target Url to download
return: ticket(Unique download ID, It can be usedto get more information about a specific download)
referece: https://www.webosose.org/docs/reference/ls2-api/com-webos-service-downloadmanager/#download
*/

interface downloadResult {
  ticket: string,
  amountReceived: Number,
  amountTotal: Number
}

export const download = (
  sourceUrl: string,
  authToken: string,
  targetDir: string,
  targetFileName: string, //File name to use when saving the download file
  subscribe: boolean
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
        amountTotal
      } = response
      console.log("download", response);
      if (returnValue) {
        resolve({ ticket, amountReceived, amountTotal });
      } else {
        reject({ errorCode, errorText });
      }
    };
    var url = "luna://com.webos.service.downloadmanager/download/";
    var params = JSON.stringify({
      target: sourceUrl,
      authToken,
      targetDir,
      targetFileName,
      subscribe
    });
    bridge.call(url, params);
  });
}