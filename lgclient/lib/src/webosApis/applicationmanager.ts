import { APPID } from "../config";

export const restart = (): Promise<void> => {
    return close().then(res=>{
      if(res){
        return launch()
      }
    })
}

export const launch =():Promise<any>=>{
  return new Promise((resolve, reject) => {
    //@ts-ignore
    var bridge = window.webosBridge;
    bridge.onservicecallback = (msg: string) => {
      var response = JSON.parse(msg);
      const { returnValue, errorText } = response;
      console.log("getAttachedStorageDeviceList", response);
      if (returnValue) {
        resolve(returnValue)
      } else {
        reject(errorText)
      }
    }
    var url = "luna://com.webos.service.applicationmanager/launch";
    var params = JSON.stringify({id:APPID});
    bridge.call(url, params)
  })
}

export const close =():Promise<any>=>{
  return new Promise((resolve, reject) => {
    //@ts-ignore
    var bridge = window.webosBridge;
    bridge.onservicecallback = (msg: string) => {
      var response = JSON.parse(msg);
      const { returnValue, errorText } = response;
      console.log("getAttachedStorageDeviceList", response);
      if (returnValue) {
        resolve(returnValue)
      } else {
        reject(errorText)
      }
    }
    var url = "luna://com.webos.service.applicationmanager/closeByAppId";
    var params = JSON.stringify({id:APPID});
    bridge.call(url, params)
  })
}