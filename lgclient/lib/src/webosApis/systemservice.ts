//https://www.webosose.org/docs/reference/ls2-api/com-webos-service-systemservic
//e/#deviceinfo-query
/*
  note:don't concurrence call, but use sequence call
  for example
  queryDeviceInfo()
  .then(res=>{console.log('device info',res)})
  .then(()=>{
    return queryosInfo()
  })
  .then(res=>console.log('os info', res))
*/

//return available info
/*
{
  wired_addr,
  bt_addr,
  wifi_addr,
  returnValue:true,
  device_name //raspberrypi4
}
*/
export const queryDeviceInfo = () : Promise < any > => {
  return new Promise((resolve, reject) => {
    //@ts-ignore
    var bridge = window.webosBridge;
    bridge.onservicecallback = (msg : string) => {
      var response = JSON.parse(msg);
      const {returnValue, errorText} = response;
      console.log("deviceInfo", response);
      if (returnValue) {
        resolve(response);
      } else {
        reject(errorText);
      }
    }
    var url = "luna://com.webos.service.systemservice/deviceInfo/query";
    var params = JSON.stringify({});
    bridge.call(url, params)
  })
}

/*
{
  webos_name,//webOS,OSE
  webos_release //2.13.1.g
}
*/
export const queryosInfo = () : Promise < any > => {
  return new Promise((resolve, reject) => {
    //@ts-ignore
    var bridge = window.webosBridge;
    bridge.onservicecallback = (msg : string) => {
      var response = JSON.parse(msg);
      const {returnValue, errorText} = response;
      console.log("osInfo", response);
      if (returnValue) {
        resolve(response);
      } else {
        reject(errorText);
      }
    };
    var url = "luna://com.webos.service.systemservice/osInfo/query";
    var params = JSON.stringify({
      parameters: ["webos_name", "webos_release", "webos_build_id"]
    })
    bridge.call(url, params);
  })
}