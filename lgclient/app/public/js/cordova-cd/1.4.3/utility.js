/*!
 * ============================================================================
 *   ID SW PLATFORM TEAM, LG ELECTRONICS INC., SEOUL, KOREA                       
 *   Copyright(c) 2016 by LG Electronics Inc.                                  
 *                                                                             
 *   Release Version : 1.4.3.0
 * ============================================================================
 */
cordova.define("cordova/plugin/utility",function(c,e,b){function d(k){}var g;if(window.PalmSystem){d("Window.PalmSystem Available");g=c("cordova/plugin/webos/service")}else{g={Request:function(k,l){d(k+" invoked. But I am a dummy because PalmSystem is not available");if(typeof l.onFailure==="function"){l.onFailure({returnValue:false,errorText:"PalmSystem Not Available. Cordova is not installed?"})}}}}var f=function(){};function i(l,m,k){if(l.errorCode===undefined||l.errorCode===null){l.errorCode=m}if(l.errorText===undefined||l.errorText===null){l.errorText=k}}var h=null;var a={};function j(k){if(h===null){g.Request("luna://com.webos.service.tv.systemproperty",{method:"getSystemInfo",parameters:{keys:["sdkVersion","boardType"]},onSuccess:function(l){d("getPlatformInfo: onSuccess");d("version : "+l.sdkVersion);var m=l.sdkVersion.split(".");if(m.length>=1&&m[0]==="1"){a={webOSVer:1,chipset:l.boardType.split("_")[0]}}else{if(m.length>=1&&m[0]==="2"){a={webOSVer:2,chipset:l.boardType.split("_")[0]}}else{if(m.length>=1&&m[0]==="3"){a={webOSVer:3,chipset:l.boardType.split("_")[0]}}else{a={webOSVer:0,chipset:""}}}}h=a.webOSVer;k(a)},onFailure:function(l){d("getPlatformInfo: onFailure");a={webOSVer:0,chipset:""};k(a)}})}else{k(a)}}f.prototype.createToast=function(l,m,n){d("createToast: "+n.msg);if(n.msg===null&&typeof m==="function"){var k={};i(k,"UTCT","Utility.createToast returns failure. command was not defined.");m(k);d("Utility.createToast invalid ");return}g.Request("luna://com.webos.service.commercial.signage.storageservice/",{method:"createToast",parameters:{text:n.msg},onSuccess:function(o){d("createToast: On Success");if(o.returnValue===true){if(typeof l==="function"){l()}}},onFailure:function(o){d("createToast: On Failure");delete o.returnValue;if(typeof m==="function"){i(o,"UTCT","Utility.createToast returns failure.");m(o)}}});d("Utility.createToast Done")};b.exports=f});Utility=cordova.require("cordova/plugin/utility");