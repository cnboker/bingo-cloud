export function autoboot(): Promise<any> {
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
    var url = "luna://com.ioliz.dc.app.bootservice/autoboot";
    var params = JSON.stringify({});
    bridge.call(url, params)
  })
}

export function startServer(): Promise<any> {
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
    var url = "luna://com.ioliz.dc.app.bootservice/startServer";
    var params = JSON.stringify({});
    bridge.call(url, params)
  })
}