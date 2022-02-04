export function appbootInstall(): Promise<any> {
  var url = "luna://com.ioliz.dc.app.bootservice/appboot/install";
  return noParameterBridge(url)
}

export function appbootUninstall(): Promise<any> {
  var url = "luna://com.ioliz.dc.app.bootservice/appboot/uninstall";
  return noParameterBridge(url)
}

export function httpserverInstall(): Promise<any> {
  var url = "luna://com.ioliz.dc.app.bootservice/httpserver/install";
  return noParameterBridge(url)
}

export function httpserverUninstall(): Promise<any> {
  var url = "luna://com.ioliz.dc.app.bootservice/httpserver/uninstall";
  return noParameterBridge(url)
}

function noParameterBridge(url: string): Promise<any> {
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
    //var url = "luna://com.ioliz.dc.app.bootservice/httpserver/uninstall";
    var params = JSON.stringify({});
    bridge.call(url, params)
  })
}