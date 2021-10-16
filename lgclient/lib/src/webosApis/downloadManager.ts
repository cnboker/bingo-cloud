/*
sourceUrl:target Url to download
return: ticket(Unique download ID, It can be usedto get more information about a specific download)
referece: https://www.webosose.org/docs/reference/ls2-api/com-webos-service-downloadmanager/#download
*/

interface downloadResult {
  ticket: string,
  amountReceived: number,
  amountTotal: number
}

export const download = (
  sourceUrl: string,
  authToken: string,
  subscribe: (result:downloadResult)=>void
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
        resolve({ ticket, amountReceived:0, amountTotal:0 });
      }
      else if(returnValue === false){
        reject({ errorCode, errorText });
      }
      //通知推送
      if (typeof subscribe === 'function') {
        subscribe({ ticket, amountReceived, amountTotal })
      }
     
    };
    var url = "luna://com.webos.service.downloadmanager/download";
    var params = JSON.stringify({
      target: sourceUrl,
      authToken,
      subscribe:typeof subscribe === 'function'
    });
    bridge.call(url, params);
  });
}