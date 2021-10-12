cordova.define("cordova/plugin/storage",function(d,h,b){var i;function f(k){console.log(k)}if(window.PalmSystem){f("Window.PalmSystem Available");i=d("cordova/plugin/webos/service")}else{i={Request:function(k,l){f(k+" invoked. But I am a dummy because PalmSystem is not available");if(typeof l.onFailure==="function"){l.onFailure({returnValue:false,errorText:"PalmSystem Not Available. Cordova is not installed?"})}}}}function g(q){var p=g.options,k=p.parser[p.strictMode?"strict":"loose"].exec(q),n={},l=14;while(l--){n[p.key[l]]=k[l]||""}n[p.q.name]={};n[p.key[12]].replace(p.q.parser,function(o,m,r){if(m){n[p.q.name][m]=r}});c(n);return n}g.options={strictMode:false,key:["source","protocol","authority","userInfo","user","password","host","port","relative","path","directory","file","query","anchor"],q:{name:"queryKey",parser:/(?:^|&)([^&=]*)=?([^&]*)/g},parser:{strict:/^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,loose:/^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/}};function c(k){if(k.protocol==="file"){if(k.host==="internal"){return a(k)}else{if(k.host==="usb"){e(k)}else{throw" Invalid Host: "+k.host}}}else{if(k.protocol==="http"||k.protocol==="https"){if(k.path.charAt(k.path.length-1)==="/"){throw"Invalid path: "+k.path}else{return}}else{throw"Invalid protocol: "+k.protocol}}}function a(k){if(k.path){f("Path: "+k.path);if(k.path.lastIndexOf("/")>0){throw"Invalid internal path: "+k.path}else{return}}else{f("No Path: ");throw"Invalid internal path: "+k.path}}function e(k){if(k.port){if(k.port.match("/[0-9]+/")){return{result:true}}else{throw"Invalid USB host: "+k.host}}else{throw"Invalid USB host: "+k.host}if(k.path){if(k.path.charAt(k.path.length-1)==="/"){throw"Invalid USB path: "+k.path}else{return{result:true}}}else{throw"Invalid USB path: "+k.path}}var j=function(){};j.AppMode={USB:"usb",LOCAL:"local",};j.prototype.upgradeApplication=function(k,l,m){i.Request("luna://com.webos.service.commercial.signage.storageservice",{method:"upgradeApplication",parameters:{from:"remote",to:(m==undefined||m==null?j.AppMode.LOCAL:m.to),recovery:(m==undefined||m==null?false:m.recovery)},onSuccess:function(n){if(n.returnValue===true){k()}else{l({errorCode:n.errorCode,errorText:n.errorText})}},onFailure:function(n){l({errorCode:n.errorCode,errorText:n.errorText})}})};j.prototype.removeApplication=function(k,l,m){i.Request("luna://com.webos.service.commercial.signage.storageservice",{method:"removeApplication",parameters:{to:m.to},onSuccess:function(n){if(n.returnValue===true){k()}else{l({errorCode:n.errorCode,errorText:n.errorText})}},onFailure:function(n){l({errorCode:n.errorCode,errorText:n.errorText})}})};j.prototype.copyFile=function(k,l,m){f("Options: "+JSON.stringify(m,null,3));if(typeof m==="undefined"||typeof m.destination!=="string"||typeof m.source!=="string"){f("Bad options");l({errorCode:"BAD_PARAM",errorText:JSON.stringify(m,null,3)});return}i.Request("luna://com.webos.service.commercial.signage.storageservice",{method:"fs/copyFile",parameters:{dest:m.destination,src:m.source},onSuccess:function(n){if(n.returnValue===true){f("SUCCESS");k()}else{f("Err: "+n.errorText);l({errorCode:n.errorCode,errorText:n.errorText})}},onFailure:function(n){f("Err: "+n.errorText);l({errorCode:n.errorCode,errorText:n.errorText})}})};j.prototype.removeFile=function(k,l,m){if(typeof m.file!=="string"){l({errorCode:"BAD_PARAM",errorText:"options.file is a mandatory parameter"});return}var n={file:m.file};if(m.recursive===true){n.recursive=true}i.Request("luna://com.webos.service.commercial.signage.storageservice",{method:"fs/removeFile",parameters:n,onSuccess:function(o){f("onSuccess");if(o.returnValue===true){k()}else{l({errorCode:o.errorCode,errorText:o.errorText})}},onFailure:function(o){f("onFailure");l({errorCode:o.errorCode,errorText:o.errorText})}})};j.prototype.listFiles=function(k,l,m){var n={};if(typeof m==="undefined"||typeof m.path==="undefined"){n.pathURI="file://internal/"}else{n.pathURI=m.path}i.Request("luna://com.webos.service.commercial.signage.storageservice/",{method:"fs/listFiles",parameters:n,onSuccess:function(o){if(o.returnValue===true){var p={files:o.files,totalCount:o.totalCount};k(p)}else{l({errorCode:o.errorCode,errorText:o.errorText})}},onFailure:function(o){l({errorCode:o.errorCode,errorText:o.errorText})}})};j.prototype.getStorageInfo=function(k,l){i.Request("luna://com.webos.service.commercial.signage.storageservice",{method:"fs/storageInfo",parameters:{},onSuccess:function(m){f("returned : "+JSON.stringify(m,null,3));if(m.returnValue===true){f("returned : "+JSON.stringify(m,null,3));var n={free:m.spaceInfo.freeSize,total:m.spaceInfo.totalSize,used:m.spaceInfo.usedSize,externalMemory:m.externalStorage};k(n)}else{l({errorCode:m.errorCode,errorText:m.errorText})}},onFailure:function(m){l({errorCode:m.errorCode,errorText:m.errorText})}})};j.prototype.mkdir=function(k,l,m){if(typeof m.path!=="string"){l({errorCode:"BAD_PARAM",errorText:"options.path is a mandatory parameter"});return}var n={pathURI:m.path};i.Request("luna://com.webos.service.commercial.signage.storageservice",{method:"fs/mkdir",parameters:n,onSuccess:function(o){f("onSuccess");if(o.returnValue===true){k()}else{l({errorCode:o.errorCode,errorText:o.errorText})}},onFailure:function(o){f("onFailure");l({errorCode:o.errorCode,errorText:o.errorText})}})};j.prototype.exists=function(k,l,m){if(typeof m.path!=="string"){f("BAD_PARAM");l({errorCode:"BAD_PARAM",errorText:"options.path is a mandatory parameter"});return}var n={pathURI:m.path};i.Request("luna://com.webos.service.commercial.signage.storageservice",{method:"fs/exists",parameters:n,onSuccess:function(o){f("onSuccess");if(o.returnValue===true){f("returned : "+JSON.stringify(o,null,3));var p={exists:o.exists,};k(p)}else{l({errorCode:o.errorCode,errorText:o.errorText})}},onFailure:function(o){f("onFailure");l({errorCode:o.errorCode,errorText:o.errorText})}})};j.prototype.readFile=function(k,l,m){};j.prototype.writeFile=function(k,l,m){};j.prototype.statFile=function(k,l,m){};j.prototype.removeAll=function(k,l,m){};j.prototype.syncFile=function(k,l,m){};j.prototype.moveFile=function(k,l,m){};j.prototype.unzipFile=function(k,l,m){};b.exports=j});Storage=cordova.require("cordova/plugin/storage");