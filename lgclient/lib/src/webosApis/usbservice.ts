export const getAttachedStorageDeviceList = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    //@ts-ignore
    var bridge = window.webosBridge;
    bridge.onservicecallback = (msg: string) => {
      var response = JSON.parse(msg);
      const { returnValue, errorText } = response;
      console.log("getAttachedStorageDeviceList", response);
      if (returnValue) {
        resolve(response)
      } else {
        reject(errorText)
      }
    }
    var url = "luna://com.webos.service.pdm/getAttachedStorageDeviceList";
    var params = JSON.stringify({subscribe:true});
    bridge.call(url, params)
  })
}

export const eject = (deviceNum:number): Promise<any> => {
  return new Promise((resolve, reject) => {
    //@ts-ignore
    var bridge = window.webosBridge;
    bridge.onservicecallback = (msg: string) => {
      var response = JSON.parse(msg);
      const { returnValue, errorText } = response;
      console.log("eject", response);
      if (returnValue) {
        resolve(returnValue)
      } else {
        reject(errorText)
      }
    }
    var url = "luna://com.webos.service.pdm/eject";
    var params = JSON.stringify({deviceNum});
    bridge.call(url, params)
  })
}