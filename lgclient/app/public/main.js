'use strict';

/********************************
 * Variable declaration
 ********************************/
var logFlag = true;

var CURRENT_DEGREE = 0;

var webOSVersion = '';

var CORDOVA_PATH = './js/cordova/2.7.0/cordova.webos.js';
var CUSTOMJS_PATH = './js/custom/custom.js';

var SCAP_FILES = [
    // SCAP v1.2 & v1.3
    'configuration.js',
    'deviceInfo.js',
    'inputSource.js',
    'power.js',
    'signage.js',
    'sound.js',
    'storage.js',
    'video.js',
    // SCAP v1.4 & v1.5 & v1.6
    'security.js',
    'time.js',
    'utility.js'
]

var SCAP_FILES_INDEX = {
    '1.0': 7,
    '2.0': 7,
    '3.0': 10,
    '3.2': 10,
    '4.0': 10
}

var SCAP_PATH = {
    '1.0': './js/cordova-cd/1.2/',
    '2.0': './js/cordova-cd/1.3/',
    '3.0': './js/cordova-cd/1.4.4/',
    '3.2': './js/cordova-cd/1.5.5/',
    '4.0': './js/cordova-cd/1.6.0/'
}

/********************************
 * Select SCAP API version
 ********************************/
// Depending on the device platform, the Cordova and CustomJS library are automatically loaded.
function checkOS(cb) {
    if(!window.PalmServiceBridge) {
        errorLog("PalmServiceBridge not found.");
        if(cb){
            cb();
        }
         return;
    }
    
    var script1 = document.createElement('script');
    script1.src = CORDOVA_PATH;
    document.head.appendChild(script1);
    
    log('addLibrary---------' + CORDOVA_PATH);
 
    script1.onload = function () {
        var script2 = document.createElement('script');
        script2.src = CUSTOMJS_PATH;
        document.head.appendChild(script2);
        
        log('addLibrary---------' + CUSTOMJS_PATH);
       
        script2.onload = function () {
            console.log('getwebOSVersion....')
            getwebOSVersion(cb);
        }
    }
   // getwebOSVersion();
}

// Gets webOS Signage version
function getwebOSVersion(cb) {
    var custom = new Custom();
    custom.Signage.getwebOSVersion(
        function successCallback(successObject) {
            webOSVersion = successObject.webOSVersion;
            
            log('webOS Signage version: ' + webOSVersion);
            // document.getElementById('status').innerHTML = '';
            // document.getElementById('status').innerHTML = 'webOS Signage version: ' + webOSVersion;
            
            switch(webOSVersion) {
                case '1.0':
                case '2.0':
                case '3.0':
                case '3.2':
                case '4.0':
                    createScript(webOSVersion,cb);
                    break;
                default:
                    errorLog('Unknown webOS Version!!')
            }
        },
        function failureCallback(failureObject) {
            errorLog('[' + failureObject.errorCode + ']' + failureObject.errorText)
        }
    )
}

// Depending on the webOS platform, the SCAP library is automatically loaded.
function createScript(webOSVersion,cb) {
    //document.getElementById('status').innerHTML = '';
    
    for (var i = 0; i <= SCAP_FILES_INDEX[webOSVersion]; i++) {
        var jsPath = SCAP_PATH[webOSVersion] + SCAP_FILES[i];
        var script = document.createElement('script');
        
        script.src = jsPath;
        document.head.appendChild(script);
        
        //log('addSCAP---------' + jsPath);
        //document.getElementById('status').innerHTML += 'SCAP API "' + jsPath + '" added!!</br>';
        
        if (i === SCAP_FILES_INDEX[webOSVersion]) {
            script.onload = function () {
                if(cb){
                    cb();
                }
                load();
            }
        }
    }
    
}

// console.log div
function log(message) {
    console.log(getTimeStamp() + ' ==> ' + message);
}

// console.error div
function errorLog(message) {
    console.error(getTimeStamp() + ' ==> ' + message);
    
  
}

function load() {
    log(new Date().toISOString() + ': ready!');
    var deviceInfo = new DeviceInfo();
    
    deviceInfo.getPlatformInfo(function (a) { log('PlatformInfo: ' + JSON.stringify(a)); }, function (a) { log(a.toString()); });
    deviceInfo.getNetworkInfo(function (b) { log('NetworkInfod - wired ip address: ' + JSON.stringify(b.wired.ipAddress) + '</br>NetworkInfod - wifi ip address: ' + JSON.stringify(b.wifi.ipAddress) ); }, function (b) { log(b.toString()); });
    
   // init();
}


// Reboot device
function reboot() {
    var options = {};
    options.powerCommand = Power.PowerCommand.REBOOT;
    
    function successCb() {
        // Do something
    }
    
    function failureCb(cbObject) {
        var errorCode = cbObject.errorCode;
        var errorText = cbObject.errorText;
        
        errorLog("Error Code [" + errorCode + "]: " + errorText);
    }
    
    var power = new Power();
    power.executePowerCommand(successCb, failureCb, options);
}


// enable or disable Debug mode (web inspector)
function debug() {
    var configuration = new Configuration();
    var options = {};
    options.enabled = true; //enabling debug mode
    configuration.debug(
        function successCb(){
            log("Succeeded to enable the debug mode");
            // document.getElementById('status').innerHTML = '';
            // document.getElementById('status').innerHTML += 'If you installed the app for the first time, </br>you can use Web Inspector after device reboot. </br>To reboot the device, press "0" on the remote control.</br>';
        },
        function failureCb(){
            errorLog("Failed to enable the debug mode");
        }, 
        options
    );
}


// Timestamp function
function getTimeStamp() {
    var d = new Date();
    var s = leadingZeros(d.getDate(), 2) + '-' +
            leadingZeros(d.getMonth() + 1, 2) + '-' +
            leadingZeros(d.getFullYear(), 4) + ' ' +
            leadingZeros(d.getHours(), 2) + ':' +
            leadingZeros(d.getMinutes(), 2) + ':' +
            leadingZeros(d.getSeconds(), 2);
    return s;
}

function leadingZeros(n, digits) {
    var zero = '';
    var data = n.toString();
    
    if (data.length < digits) {
        for (var i = 0; i < digits - data.length; i++) {
            zero += '0';
        }
    }
    return zero + data;
}

/********************************
 * CustomJS test
 ********************************/
// Sets native portrait mode.
function updateDegreeIndex() {
    var DEGREE_INDEX = [
        Custom.NATIVEPORTRAIT.OFF,
        Custom.NATIVEPORTRAIT.DEGREE_90,
        Custom.NATIVEPORTRAIT.DEGREE_180,
        Custom.NATIVEPORTRAIT.DEGREE_270
    ]
    
    setPortrait(DEGREE_INDEX[CURRENT_DEGREE]);
    
    CURRENT_DEGREE = (CURRENT_DEGREE + 1) % DEGREE_INDEX.length;
}

function setPortrait(data) {
    var custom = new Custom();
    custom.Configuration.setNativePortraitMode(
        function successCallback() {
            log('Native portrait is set');
            // document.getElementById('status').innerHTML = '';
            // document.getElementById('status').innerHTML = 'Native portrait is set';
        },
        function failureCallback(failureObject) {
            errorLog('[' + failureObject.errorCode + '] ' + failureObject.errorText)
        },
        {
            nativePortrait : data
        }
    );
}


/********************************
 * Initialization
 ********************************/
// initialize function
function init() {
    debug();
    
    document.onkeydown = function(e) {
        // if (e.which === 13) {       // ok
        //     var logDiv = document.getElementById('log');
            
        //     if (logFlag) {
        //         logDiv.style.visibility = 'hidden';
        //         logFlag = false;
        //     } else {
        //         logDiv.style.visibility = 'visible';
        //         logFlag = true;
        //     }
        // }
        if (e.which === 48) {		// 0
            // document.getElementById('status').innerHTML = '';
            // document.getElementById('status').innerHTML += 'It will reboot in 3 seconds.';
            
            // setTimeout(function() {
            //     reboot();
            // }, 3000);
        }
        if (e.which === 49) {		// 1
            updateDegreeIndex();
            
            // document.getElementById('status').innerHTML = '';
            // document.getElementById('status').innerHTML += 'The setPortrait() worked.';
        }
        if (e.which === 50) {		// 2
            log('Test console.log');
            
            // document.getElementById('status').innerHTML = '';
            // document.getElementById('status').innerHTML += 'Test log message.';
        }
        if (e.which === 51) {		// 3
            errorLog('Test console.error');
            
            // document.getElementById('status').innerHTML = '';
            // document.getElementById('status').innerHTML += 'Test error message.';
        }
    }
}
