export const videoPlay = ()=>{
  return new Promise((resolve, reject)=>{
    var bridge = window.webosBridge;
    bridge.onservicecallback = msg => {
      var response = JSON.parse(msg);
      const { returnValue, errorText } = response;
      console.log("videoPlay", response);
      if (returnValue) {
        resolve(response);
      } else {
        reject(errorText);
      }
    }
    var url = "luna://com.webos.media/load";
    var params = JSON.stringify({
      type:'media',
      playload : {
        option:{
          url:'http://127.0.0.1:8888/sample.mp4',
          appId:'com.webos.app.enactbrowser',
          windowId:'_Window_Id_2'
        }
      }
    });
    bridge.call(url, params);
  })
}

export const getDeviceInfo = () => {
  return new Promise((resolve, reject) => {
    var bridge = window.webosBridge;
    bridge.onservicecallback = msg => {
      var response = JSON.parse(msg);
      const { returnValue, errorText } = response;
      console.log("deviceInfo", response);
      if (returnValue) {
        resolve(response);
      } else {
        reject(errorText);
      }
    };
    var url = "luna://com.webos.service.systemservice/deviceInfo/query";
    var params = JSON.stringify({});
    bridge.call(url, params);
  });
};

export const getOSInfo = () => {
  return new Promise((resolve, reject) => {
    var bridge = window.webosBridge;
    bridge.onservicecallback = msg => {
      var response = JSON.parse(msg);
      const { returnValue, errorText } = response;
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
    });
    bridge.call(url, params);
  });
};

// export function getDeviceInfo() {
//   return Promise.all([
//     getNetworkInfo(),
//     getPlatformInfo(),
//     getNetworkMacInfo()
//   ]).then(([a, b, c]) => {
//     console.log('platform',b)
//     console.log('getNetworkMacInfo',c)
//     const { modelName, osdResolution, manufacturer } = b;
//     const { wiredInfo } = c;
//     const { wired, wifi } = a;
//     var ipAddress = "";
//     console.log("wired,wifi", wired, wifi);
//     if (wired.state === 'connected') {
//       ipAddress = wired.ipAddress;
//     } else if (wifi.state === 'connected') {
//       ipAddress = wifi.ipAddress;
//     }
//     return {
//       macAddress:wiredInfo.macAddress.replace(/:/g,''),
//       name: manufacturer,
//       ip: ipAddress,
//       os: modelName,
//       resolution: osdResolution
//     };
//   });
// }
/*
console.log("cbObject : " + JSON.stringify(cbObject));
console.log("isInternetConnectionAvailable : " + cbObject.isInternetConnectionAvailable);
console.log("wired.state : " + cbObject.wired.state);
console.log("wired.method : " + cbObject.wired.method);
console.log("wired.ipAddress : " + cbObject.wired.ipAddress);
console.log("wired.netmask : " + cbObject.wired.netmask);
console.log("wired.dns1 : " + cbObject.wired.dns1);
console.log("wired.dns2 : " + cbObject.wired.dns2);
console.log("wifi.state : " + cbObject.wifi.state);
console.log("wifi.method : " + cbObject.wifi.method);
console.log("wifi.ipAddress : " + cbObject.wifi.ipAddress);
console.log("wifi.netmask : " + cbObject.wifi.netmask);
console.log("wifi.dns1 : " + cbObject.wifi.dns1);
console.log("wifi.dns2 : " + cbObject.wifi.dns2);
*/
// function getNetworkInfo() {
//   return new Promise((resolve, reject) => {
//     new window.DeviceInfo().getNetworkInfo(
//       obj => {
//         resolve(obj);
//       },
//       errorObj => {
//         var errorCode = errorObj.errorCode;
//         var errorText = errorObj.errorText;
//         console.log("Error Code [" + errorCode + "]: " + errorText);
//         reject(errorObj);
//       }
//     );
//   });
// }

/*
console.log("cbObject : " + JSON.stringify(cbObject));
console.log("hardwareVersion : " + cbObject.hardwareVersion);
console.log("modelName : " + cbObject.modelName);
console.log("osdResolution : " + cbObject.osdResolution);
console.log("platformName : " + cbObject.platformName);
console.log("sdkVersion : " + cbObject.sdkVersion);
console.log("serialNumber : " + cbObject.serialNumber);
console.log("firmwareVersion : " + cbObject.firmwareVersion);
        
*/
// function getPlatformInfo() {
//   return new Promise((resolve, reject) => {
//     new window.DeviceInfo().getPlatformInfo(
//       obj => {
//         resolve(obj);
//       },
//       errorObj => {
//         var errorCode = errorObj.errorCode;
//         var errorText = errorObj.errorText;
//         console.log("Error Code [" + errorCode + "]: " + errorText);
//         reject(errorObj);
//       }
//     );
//   });
// }

/*
console.log("cbObject : " + JSON.stringify(cbObject));
console.log("wiredInfo.macAddress : " + cbObject.wiredInfo.macAddress);
*/
// function getNetworkMacInfo() {
//   return new Promise((resolve, reject) => {
//     new window.DeviceInfo().getNetworkMacInfo(
//       obj => {
//         resolve(obj);
//       },
//       errorObj => {
//         var errorCode = errorObj.errorCode;
//         var errorText = errorObj.errorText;
//         console.log("Error Code [" + errorCode + "]: " + errorText);
//         reject(errorObj);
//       }
//     );
//   });
// }

/*
   console.log("memory.total : " + cbObject.memory.total);
  console.log("memory.free : " + cbObject.memory.free);
  for (var i in cbObject.cpus) {
      console.log("cpu.model " +  cbObject.cpus[i].model);
      console.log("cpu.times.user " +  cbObject.cpus[i].times.user);
      console.log("cpu.times.nice " +  cbObject.cpus[i].times.nice);
      console.log("cpu.times.sys " +  cbObject.cpus[i].times.sys);
      console.log("cpu.times.idle " +  cbObject.cpus[i].times.idle);
      console.log("cpu.times.irq " +  cbObject.cpus[i].times.irq);
  } 
         
 * 
 */
function getSystemUsageInfo() {
  return new Promise((resolve, reject) => {
    new window.DeviceInfo().getSystemUsageInfo(
      obj => {
        resolve(obj);
      },
      errorObj => {
        var errorCode = errorObj.errorCode;
        var errorText = errorObj.errorText;
        console.log("Error Code [" + errorCode + "]: " + errorText);
        reject(errorObj);
      }
    );
  });
}

export function connectWifi(ssid, password) {
  var options = {
    ssid,
    password
  };
  return new Promise((resolve, reject) => {
    new window.DeviceInfo().connectWifi(
      obj => {
        resolve(obj);
      },
      errorObj => {
        var errorCode = errorObj.errorCode;
        var errorText = errorObj.errorText;
        console.log("Error Code [" + errorCode + "]: " + errorText);
        reject(errorObj);
      },
      options
    );
  });
}
