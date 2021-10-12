/*
 * ============================================================================
 *   ID ENGINEERING R&D TEAM, LG ELECTRONICS INC., PYEONGTAEK, KOREA                       
 *   Copyright(c) 2016 by LG Electronics Inc.                                  
 *                              
 *   Author          : signagesupport@lge.com
 *   Modified Date   : 2018-07-10
 *   Release Version : 1.3180710
 * 
 *   See ./doc/index.html for more detail
 * ============================================================================
 */

/**
 * @fileoverview CustomJS APIs
 * @author signagesupport@lge.com
 * @version 1.3180710
 * @since 2018.07.10
 */


/**
 * @class Custom
 * @classdesc CustomJS APIs, can attach to SCAP APIs
 * @constructor Custom
 * @example
 * <!-- HTML File -->
 * <HTML>
 *     <HEAD>
 *         <!-- Same usage method with SCAP API -->
 *         <script type='text/javascript' src='./js/cordova/2.7.0/cordova.webos.js'></script>
 *         <script type='text/javascript' src='./custom.js'></script>
 *     </HEAD>
 *     <BODY>
 *         <!-- Do something -->
 *     </BODY>
 * </HTML>
 * @example
 * // JavaScript File 
 * var custom = new Custom();
 */

(function () {
    cordova.define("cordova/plugin/custom", function (require, exports, module) {
        function DEBUG_LOG(msg) { }
        var webOS;
        if (window.PalmSystem) {
            DEBUG_LOG("Window.PalmSystem Available");
            webOS = require("cordova/plugin/webos/service")
        } else {
            webOS = {
                Request: function (lunaURL, parameters) {
                    DEBUG_LOG(lunaURL + " invoked. But I am a dummy because PalmSystem is not available");
                    if (typeof parameters.onFailure === "function") {
                        parameters.onFailure({
                            returnValue: false,
                            errorCode: 'NOT_WEBOS',
                            errorText: "PalmSystem Not Available. Cordova is not installed?"
                        })
                    }
                }
            }
        }
        var Custom = function () { };


        /**
         * @private 
         */
        // Minumum platform version for supporting APIs.
        // All APIs check platform version before being operated.
        var MINIMUM_PLATFORM_SUPPORTED_API = {
            "1.0": ['getPowerOnOffHistory', 'changePassword', 'getwebOSVersion', 'disableApplication', 'setPowerOnStatus', 'getPowerOnStatus',
                'setWhiteBalanceRGB', 'getWhiteBalanceRGB'],
            "2.0": ['getKAM', 'setKAM', 'getApplicationInfo', 'switchApplication', 'setMaster', 'setSlave',
                'setAvSync', 'setAvSyncSpeaker', 'setAvSyncBypass', 'getAvSync', 'getAvSyncSpeaker', 'getAvSyncBypass', 'addUSBAttachEventListener', 'removeUSBAttachEventListener'],
            "3.0": ['getWoWLAN', 'setWoWLAN', 'getNativePortraitMode', 'setNativePortraitMode', 'setNoSignalImageStatus', 'getNoSignalImageStatus',
                'clearBrowsingData'],
            "3.2": ['setEnterpriseCode', 'getPortControl', 'setPortControl'],
            "4.0": []
        }

        // Subscribed information
        var SUBSCRIBED = {
            USBAttachEventListener: null
        }

        // Stored platform information
        var PLATFORM_INFO = {
            webOSVersion: -2
        };

        var CATEGORY = {
            COMMERCIAL: 'commercial',
            HOTELMODE: 'hotelMode',
            NETWORK: 'network',
            OPTION: 'option',
            //////////////////////////////////////////////////////////////////////////	180102 hyunsung07.lee
            SOUND: 'sound',
            //////////////////////////////////////////////////////////////////////////	180102 hyunsung07.lee
            /// 20180115 iamjunyoung.park : Add 'picture' for set/getWhitebalanceRGB
            PICTURE: 'picture',
            /// 20180517 iamjunyoung.park : Add 'lock' for changePassword from webOS Signage 3.2
            LOCK: 'lock'
        }

        var KEYS = {
            KEEP_ALIVE_MODE: 'enableKAM',
            PASSWORD: 'password',
            NATIVE_PORTRAIT: 'siAppOrientation', // for webOS Signage 3.0
            SCREEN_ROTATION: 'screenRotation', // for webOS Signage 3.2
            WOWLAN: 'wolwowlOnOff',
            POWER_ON_STATUS: 'powerOnStatus',
            POWER_ON_OFF_HISTORY: 'powerOnOffHistory',
            NTP_SERVER: 'networkTimeSource',
            //////////////////////////////////////////////////////////////////////////	180102 hyunsung07.lee
            AVSYNC: 'avSync',
            AVSYNCSPEAKER: 'avSyncSpeaker',
            AVSYNCBYPASSINPUT: 'avSyncBypassInput',
            NOSIGNALIMAGE: 'noSignalImage',
            TYPES: 'types',
            //////////////////////////////////////////////////////////////////////////	180102 hyunsung07.lee
            // 20180115 iamjunyoung.park : Add 'pictureMode' for set/getWhitebalanceRGB
            PICTUREMODE: 'pictureMode',
            // 20180517 iamjunyoung.park : Add 'systemPin' for changePassword from webOS Signage 3.2
            SYSTEMPIN: 'systemPin',
            // 20180905 iamjunyoung.park : Add 'blockedPortList' for Port block from webOS Signage 3.2
            BLOCKED_PORT_LIST: 'blockedPortList'
        }

        /**
         * TODO : Will be updated all scenario about error
         */

        /**
         * @constant Custom#ERROR_CODE 
         * @description Error code list.
         * @version 1.0
         * @property {string} Custom.COMMON.OLD_WEBOS_VERSION     
         *                    Called API need later version of webOS Signage than current device's webOS Signage version.
         * @property {string} Custom.COMMON.UNSUPPORTED_API     
         *                    Device or current firmware can't support called API.
         * @property {string} Custom.COMMON.BAD_PARAMETERS     
         *                    Parameter is invalid, such as parameeters are missing or invalid type.
         * @property {string} Custom.COMMON.INTERNAL_ERROR     
         *                    Error is occurred during API is operating internally.
         * @property {string} Custom.COMMON.NOT_MONITORING     
         *                    If you call stopMonitoring API before start monitoring API, this error is occurred.
         * @property {string} Custom.COMMON.MEDIA_ERROR     
         *                    Error regarding media, such as audio or video.
         * 
         * @property {string} Custom.CONFIGURATION.ACCESS_DENIED
         *                    Change password is failed due to wrong password is inputted.
         * @property {string} Custom.CONFIGURATION.INVALID_PASSWORD_FORMAT 
         *                    Password format is invalid.
         * 
         * @property {string} Custom.APPLICATION.SETTINGS_ERROR 
         *                    SI Server settings is invalid for operating used API.
         * @property {string} Custom.APPLICATION.NOT_INSTALLED 
         *                    Target application is not installed.
         */
        Custom.ERROR_CODE = {
            // Common error code
            COMMON: {
                OLD_WEBOS_VERSION: 'OLD_WEBOS_VERSION',
                UNSUPPORTED_API: 'UNSUPPORTED_API',
                BAD_PARAMETERS: 'BAD_PARAMETERS',
                INTERNAL_ERROR: 'INTERNAL_ERROR',
                NOT_MONITORING: 'NOT_MONITORING',
                MEDIA_ERROR: 'MEDIA_ERROR'
            },
            // Each API's error code
            CONFIGURATION: {
                // changePassword
                INVALID_PASSWORD_FORMAT: 'BAD_PARAMETERS',
                ACCESS_DENIED: 'ACCESS_DENIED',
                // 180115 iamjunyoung.park : Add 'INVALID_CONFIG'
                INVALID_CONFIG: 'INVALID_CONFIGURATION'
            },
            // Error codes regarding application
            APPLICATION: {
                SETTINGS_ERROR: 'SETTINGS_ERROR',
                NOT_INSTALLED: 'NOT_INSTALLED'

            }
        }

        //////////////////////////////////////////////////////////////////////////	180102 hyunsung07.lee
        /**
         * @constant Custom#CLEARBROWSINGDATATYPES
         * @description clearBrowsingData CLEARBROWSINGDATATYPES.
         * @version 1.1180102
         * @property {string} Custom.CLEARBROWSINGDATATYPES.ALL             - Clears browsing all data.
         * @property {string} Custom.CLEARBROWSINGDATATYPES.APPCACHE        - Clears browsing appcache data.
         * @property {string} Custom.CLEARBROWSINGDATATYPES.CACHE           - Clears browsing cache data.
         * @property {string} Custom.CLEARBROWSINGDATATYPES.CHANNELIDS      - Clears browsing channelIDs data.
         * @property {string} Custom.CLEARBROWSINGDATATYPES.COOKIES         - Clears browsing cookies data.
         * @property {string} Custom.CLEARBROWSINGDATATYPES.FILESYSTEMS     - Clears browsing filesystems data.
         * @property {string} Custom.CLEARBROWSINGDATATYPES.INDEXEDDB       - Clears browsing indexedDB data.
         * @property {string} Custom.CLEARBROWSINGDATATYPES.LOCALSTORAGE    - Clears browsing localstorage data.
         * @property {string} Custom.CLEARBROWSINGDATATYPES.SERVICEWORKERS  - Clears browsing serviceworkers data.
         * @property {string} Custom.CLEARBROWSINGDATATYPES.WEBSQL          - Clears browsing webSQL data.
         */
        Custom.CLEARBROWSINGDATATYPES = {
            ALL: 'all',
            APPCACHE: 'appcache',
            CACHE: 'cache',
            //CACHESTORAGE: 'cachestorage',
            CHANNELIDS: 'channelIDs',
            //CODECACHE: 'codecache',
            COOKIES: 'cookies',
            FILESYSTEMS: 'filesystems',
            INDEXEDDB: 'indexedDB',
            LOCALSTORAGE: 'localstorage',
            SERVICEWORKERS: 'serviceworkers',
            WEBSQL: 'webSQL'

            // {"types":["cache"]}
        }

        /**
         * @constant Custom#AVSYNC
         * @description avSync value.
         * @version 1.1180102
         * @property {string} Custom.AVSYNC.ON     - avSync On
         * @property {string} Custom.AVSYNC.OFF    - avSync Off
         */
        Custom.AVSYNC = {
            ON: 'on',
            OFF: 'off',

            //{"settings":{"avSync":"on"},"category":"sound"}
        }

        /**
         * @constant Custom#AVSYNCBYPASS
         * @description avSync Bypass value.
         * @version 1.1180102
         * @property {string} Custom.AVSYNCBYPASS.ON    - avSync Bypass On
         * @property {string} Custom.AVSYNCBYPASS.OFF    - avSync Bypass Off
         */
        Custom.AVSYNCBYPASS = {
            ON: 'on',
            OFF: 'off',

            //{"settings":{"avSyncBypassInput":"on"},"category":"sound"}
        }

        /**
         * @constant Custom#NOSIGNALIMAGE
         * @description NoSignalImage value.
         * @version 1.1180102
         * @property {string} Custom.NOSIGNALIMAGE.ON    - NoSignalImage On
         * @property {string} Custom.NOSIGNALIMAGE.OFF    - NoSignalImage Off
         */
        Custom.NOSIGNALIMAGE = {
            ON: 'on',
            OFF: 'off',

            //{"category":"commercial", "settings": {"noSignalImage": "on"}}
        }
        //////////////////////////////////////////////////////////////////////////	180102 hyunsung07.lee

        /**
         * @constant Custom#POWERONSTATUS
         * @description Power On Status value.
         * @version 1.0170223
         * @property {string} Custom.POWERONSTATUS.POWERON    - Power On
         * @property {string} Custom.POWERONSTATUS.STANDBY    - Standby
         * @property {string} Custom.POWERONSTATUS.LASTSTATUS - Last Status
         */
        Custom.POWERONSTATUS = {
            POWERON: 'power_on',
            STANDBY: 'stand_by',
            LASTSTATUS: 'lst',
        }
        /**
         * @constant Custom#APPLICATION 
         * @description Application values that you can launch.
         *          <br>Note that external signal application should be used only if your device is supported.
         * @version 1.0
         * @property {string} Custom.APPLICATION.ZIP_TYPE       - ZIP Type application
         * @property {string} Custom.APPLICATION.IPK_TYPE       - IPK Type application
         * @property {string} Custom.APPLICATION.EXTERNAL_HDMI  - External Input HDMI
         * @property {string} Custom.APPLICATION.EXTERNAL_HDMI1 - External Input HDMI1
         * @property {string} Custom.APPLICATION.EXTERNAL_HDMI2 - External Input HDMI2
         * @property {string} Custom.APPLICATION.EXTERNAL_HDMI3 - External Input HDMI3
         * @property {string} Custom.APPLICATION.EXTERNAL_HDMI4 - External Input HDMI4
         * @property {string} Custom.APPLICATION.EXTERNAL_RGB   - External Input RGB
         * @property {string} Custom.APPLICATION.EXTERNAL_DVI   - External Input DVI
         * @property {string} Custom.APPLICATION.EXTERNAL_DP    - External Input DisplayPort
         * @property {string} Custom.APPLICATION.EXTERNAL_OPS   - External Input OPS
         */
        Custom.APPLICATION = {
            ZIP_TYPE: 'commercial.signage.signageapplauncher',
            IPK_TYPE: 'com.lg.app.signage',
            EXTERNAL_HDMI: 'com.webos.app.hdmi1',
            EXTERNAL_HDMI1: 'com.webos.app.hdmi1',
            EXTERNAL_HDMI2: 'com.webos.app.hdmi2',
            EXTERNAL_HDMI3: 'com.webos.app.hdmi3',
            EXTERNAL_HDMI4: 'com.webos.app.hdmi4',
            EXTERNAL_RGB: 'com.webos.app.externalinput.rgb',
            EXTERNAL_DVI: 'com.webos.app.hdmi2',
            EXTERNAL_DP: 'com.webos.app.hdmi3',
            EXTERNAL_OPS: 'com.webos.app.hdmi4',
        };
        /**
         * @constant Custom#NATIVEPORTRAIT
         * @description Rotation degree value of Native portrait
         * @version 1.0
         * @property {string} Custom.NATIVEPORTRAIT.OFF        - Do not rotation.
         * @property {string} Custom.NATIVEPORTRAIT.DEGREE_90  - Rotate to 90 degrees clockwise.
         * @property {string} Custom.NATIVEPORTRAIT.DEGREE_180 - Rotate to 180 degrees clockwise.
         * @property {string} Custom.NATIVEPORTRAIT.DEGREE_270 - Rotate to 270 degrees clockwise.
         */
        Custom.NATIVEPORTRAIT = {
            OFF: 'off',
            DEGREE_90: '90',
            DEGREE_180: '180',
            DEGREE_270: '270'
        }

        /**
         * Private functions
         */
        var PRIVATE = {
            Common: {
                isPropertyExists: function (value) {
                    if ((typeof value !== 'undefined') && (value !== undefined) && (value !== null))
                        return true;
                    else
                        return false;
                }
            },
            /**
             * Check current platform version, and called API is supported on current platform
             */
            PlatformChecker: {
                checkPlatformSupportedThisAPI: function checkPlatformSupportedThisAPI(APIName) {
                    for (var webOSVersion in MINIMUM_PLATFORM_SUPPORTED_API) {
                        for (var idx in MINIMUM_PLATFORM_SUPPORTED_API[webOSVersion]) {
                            var functionName = MINIMUM_PLATFORM_SUPPORTED_API[webOSVersion][idx];
                            if (functionName === APIName) {
                                // Target API can be used on this platform
                                if (parseFloat(webOSVersion) <= PLATFORM_INFO.webOSVersion)
                                    return true;
                                // Target API cannot be used on this platform
                                else {
                                    return parseFloat(webOSVersion);
                                }
                            }

                        }
                    }
                    // Cannot found target API
                    return false;
                }
            },
            SubscriptionChecker: {
                /**
                 * Check subscription is enabled
                 */
                checkCurrentStatusSubscribed: function checkCurrentStatusSubscribed(subscriptionObject) {
                    if ((typeof subscriptionObject === 'object') && (typeof subscriptionObject.uri === 'string') && (typeof subscriptionObject.params === 'object')) {
                        return true;
                    }
                    else {
                        return false;
                    }
                }
            },
            ParameterChecker: {
                /**
                 * Check parameter property is valid or not
                 */
                checkParametersValidation: function checkParametersValidation(targetDataArray, parametersObject, propertyNameForSearch) {
                    if ((typeof targetDataArray !== 'object') || (typeof parametersObject !== 'object') || (typeof propertyNameForSearch !== 'string')) {
                        return null;
                    }
                    for (var i in targetDataArray) {
                        if (parametersObject[propertyNameForSearch] === targetDataArray[i])
                            return true;
                    }
                    return false;
                },
                checkMulltiParametersValidation: function checkParametersValidation(targetDataArray, parametersObject, propertyNameForSearch) {
                    if ((typeof targetDataArray !== 'object') || (typeof parametersObject !== 'object') || (typeof propertyNameForSearch !== 'string')
                        || typeof parametersObject[propertyNameForSearch] !== 'object') {
                        return null;
                    }
                    var paramArrayLength = parametersObject[propertyNameForSearch].length;
                    for (var i in parametersObject[propertyNameForSearch]) {
                        for (var j = 0; j < targetDataArray.length; j++) {
                            if (parametersObject[propertyNameForSearch][i] !== targetDataArray[j])
                                return false;
                        }
                    }
                    return true;
                },

                /**
                 * Check required parameter property is missing
                 */
                checkMissingParameters: function checkMissingParameters(parametersObject, propertyNameArray) {
                    if (typeof parametersObject !== 'object' || parametersObject === null || parametersObject === undefined) {
                        return false;
                    }
                    for (var i = 0; i < propertyNameArray.length; i++) {
                        if ((parametersObject.hasOwnProperty(propertyNameArray[i]) === false) ||
                            (parametersObject[propertyNameArray[i]] === undefined) ||
                            (parametersObject[propertyNameArray[i]] === null)) {
                            return false;
                        }
                    }
                    return true;
                }
            },
            CallbackHandler: {
                /**
                 * Before calling successCallback, check successCallback type is function.
                 * SuccessCallback has arguments only if successObject type is object. 
                 */
                callSuccessCallback: function callSuccessCallback(successCallback, successObject) {
                    if (typeof successCallback === 'function') {
                        if (typeof successObject === 'object') {
                            if (successObject.returnValue) {
                                delete successObject.returnValue;
                            }
                            successCallback(successObject);
                        }
                        else {
                            successCallback();
                        }
                    }
                },

                /**
                 * Before calling failureCallback, check errorCode and errorText is exists from failureObject.
                 * If failureObject is not exists, set errorCode and errorText to inputted parameters, and call failureCallback. 
                 */
                callFailureCallback: function callFailureCallback(failureCallback, failureObject, _errorCode, _errorText) {
                    if (typeof failureCallback === 'function') {
                        if (failureObject.returnValue) {
                            delete failureObject.returnValue;
                        }
                        if (failureObject.errorCode === -1) {
                            if (failureObject.errorText.indexOf('Unknown method') > -1) {
                                failureObject.errorCode = Custom.ERROR_CODE.COMMON.UNSUPPORTED_API;
                            }
                            else if (failureObject.errorText.indexOf('Service does not exist') > -1) {
                                failureObject.errorCode = Custom.ERROR_CODE.COMMON.UNSUPPORTED_API;
                            }
                        }
                        else {
                            if (failureObject.errorCode === undefined || failureObject.errorCode === null) {
                                failureObject.errorCode = _errorCode;
                            }
                            if (failureObject.errorText === undefined || failureObject.errorText === null) {
                                failureObject.errorText = _errorText;
                            }
                        }
                        failureCallback(failureObject);
                    }
                }
            },
            PreferencesHandler: {
                /**
                 * Set Preferences
                 */
                setPreferences: function setValue(key, value, successCallback, failureCallback) {
                    var paramObject = {};
                    paramObject[key] = value;
                    webOS.Request("palm://com.palm.systemservice/", {
                        method: "setPreferences",
                        parameters: paramObject,
                        onSuccess: function (successObject) {
                            if (typeof successCallback === "function") {
                                delete successObject.returnValue;
                                successCallback(successObject);
                            }
                        },
                        onFailure: function (errorObject) {
                            if (typeof failureCallback === "function") {
                                delete errorObject.returnValue;
                                failureCallback(errorObject);
                            }
                        }
                    });
                },

                /**
                 * Get Preferences
                 */
                getPreferences: function getValue(keysArray, successCallback, failureCallback) {
                    webOS.Request("palm://com.palm.systemservice/", {
                        method: "getPreferences",
                        parameters: {
                            keys: keysArray
                        },
                        onSuccess: function (successObject) {
                            if (typeof successCallback === "function") {
                                delete successObject.returnValue;
                                successCallback(successObject);
                            }
                        },
                        onFailure: function (errorObject) {
                            if (typeof failureCallback === "function") {
                                delete errorObject.returnValue;
                                failureCallback(errorObject);
                            }
                        }
                    });
                }
            },
            DBHandler: {
                /**
                 * Set DB using storageservice
                 */
                setValue: function setValue(category, valuesObject, successCallback, failureCallback) {
                    webOS.Request("luna://com.webos.service.commercial.signage.storageservice/settings/", {
                        method: "set",
                        parameters: {
                            category: category,
                            settings: valuesObject
                        },
                        onSuccess: function (successObject) {
                            if (typeof successCallback === "function") {
                                delete successObject.returnValue;
                                successCallback(successObject);
                            }
                        },
                        onFailure: function (errorObject) {
                            if (typeof failureCallback === "function") {
                                delete errorObject.returnValue;
                                failureCallback(errorObject);
                            }
                        }
                    });
                },

                /**
                 * Set DB using settingsservice
                 */
                setValueBySettingsService: function setValue(category, valuesObject, successCallback, failureCallback) {
                    webOS.Request('palm://com.webos.settingsservice', {
                        method: 'setSystemSettings',
                        parameters: {
                            category: category,
                            settings: valuesObject
                        },
                        onSuccess: function (successObject) {
                            if (typeof successCallback === "function") {
                                delete successObject.returnValue;
                                successCallback(successObject);
                            }
                        },
                        onFailure: function (errorObject) {
                            if (typeof failureCallback === "function") {
                                delete errorObject.returnValue;
                                failureCallback(errorObject);
                            }
                        }
                    });
                },

                /**
                 * Get DB using storageservice
                 */
                getValue: function getValue(category, keysArray, successCallback, failureCallback) {
                    webOS.Request("luna://com.webos.service.commercial.signage.storageservice/settings/", {
                        method: "get",
                        parameters: {
                            category: category,
                            keys: keysArray
                        },
                        onSuccess: function (successObject) {
                            if (typeof successCallback === "function") {
                                delete successObject.returnValue;
                                successCallback(successObject.settings);
                            }
                        },
                        onFailure: function (errorObject) {
                            if (typeof failureCallback === "function") {
                                delete errorObject.returnValue;
                                failureCallback(errorObject);
                            }
                        }
                    });
                },


                /**
                 * Get DB using settingsservice
                 */
                getValueBySettingsService: function setValue(category, keysArray, successCallback, failureCallback) {
                    webOS.Request('palm://com.webos.settingsservice', {
                        method: 'getSystemSettings',
                        parameters: {
                            category: category,
                            keys: keysArray
                        },
                        onSuccess: function (successObject) {
                            if (typeof successCallback === "function") {
                                delete successObject.returnValue;
                                successCallback(successObject.settings);
                            }
                        },
                        onFailure: function (errorObject) {
                            if (typeof failureCallback === "function") {
                                delete errorObject.returnValue;
                                failureCallback(errorObject);
                            }
                        }
                    });
                }
            }
        }




        /**
         * Get platform information
         */
        function getCurrentDevicewebOSVersion(callback) {
            if (PLATFORM_INFO.webOSVersion !== -2) {
                callback();
                return;
            }
            webOS.Request("luna://com.webos.service.systemservice/osInfo/", {
                method: "query",
                parameters: {
                    // parameters: ["core_os_kernel_version", "core_os_name", "core_os_release", "core_os_release_codename", "webos_api_version", "webos_build_datetime", "webos_build_id", "webos_imagename", "webos_name", "webos_prerelease", "webos_release", "webos_release_codename", "webos_manufacturing_version", "encryption_key_type"]
                    parameters: ["webos_release_codename"]
                },
                onSuccess: function (responseObject) {
                    delete responseObject.returnValue;
                    PLATFORM_INFO = responseObject;

                    // Check platform is 3.0 or 3.2
                    if ((PLATFORM_INFO.webos_release_codename.indexOf('deua') !== -1)
                        || (PLATFORM_INFO.webos_release_codename.indexOf('denali') !== -1)
                        || (PLATFORM_INFO.webos_release_codename.indexOf('dreadlocks') !== -1)) {

                        var request = webOS.Request("luna://com.webos.service.commercial.signage.storageservice", {
                            method: "getOnOffTimeSchedule",
                            parameters: {},
                            onComplete: function (ret) {
                                // 20180110 iamjunyoung.park : Change check DB from screenRotation/osdPortraitMode to onOffTimeSchedule
                                if (ret.settings && ret.settings.hasOwnProperty("onOffTimeSchedule")) {
                                    PLATFORM_INFO.webOSVersion = 3.2;
                                    callback();
                                }
                                else {
                                    PLATFORM_INFO.webOSVersion = 3;
                                    callback();
                                }
                            }
                        });
                    }
                    // 20180110 iamjunyoung.park : Add webOS Signage 4.0
                    else if (PLATFORM_INFO.webos_release_codename.indexOf('goldilocks') !== -1) {
                        PLATFORM_INFO.webOSVersion = 4.0;
                        callback();
                    }
                    else {
                        PLATFORM_INFO.webOSVersion = -1; // Unknown
                        callback();
                    }
                },
                onFailure: function (err) {
                    // There is no Luna API : luna://com.webos.service.systemservice/osInfo/query , so use navigator.userAgent instead.
                    // Device
                    //  - webOS 1.0 : "Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/537.41 (KHTML, like Gecko) Large Screen WebAppManager Safari/537.41"
                    //  - webOS 2.0 : "Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/538.2 (KHTML, like Gecko) Large Screen WebAppManager Safari/538.2"
                    // Emulator
                    //  - webOS 1.0 : "Mozilla/5.0 (Web0S; Linux i686) AppleWebKit/537.41 (KHTML, like Gecko) Large Screen WebAppManager Safari/537.41"
                    //  - webOS 2.0 : "Mozilla/5.0 (Web0S; Linux i686) AppleWebKit/538.2 (KHTML, like Gecko) Large Screen WebAppManager Safari/538.2"
                    function isSubstringExists(source, sub) {
                        if (source.indexOf(sub) === -1) { return false; }
                        else { return true; }
                    }

                    if ((isSubstringExists(navigator.userAgent, 'Web0S') === true) || (isSubstringExists(navigator.userAgent, 'WebAppManager') === true)) {
                        if (isSubstringExists(navigator.userAgent, 'AppleWebKit/537.41')) {
                            PLATFORM_INFO.webOSVersion = 1;
                            callback();
                        }
                        else if (isSubstringExists(navigator.userAgent, 'AppleWebKit/538.2')) {
                            PLATFORM_INFO.webOSVersion = 2;
                            callback();
                        }
                    }
                    else {
                        PLATFORM_INFO.webOSVersion = -1; // Unknown
                        callback();
                    }
                }
            });
        }
        /**
         * Get device information
         */

        // function getDeviceInformation(callback) {
        //     var request = webOS.Request("luna://com.webos.service.tv.systemproperty", {
        //         method: "getSystemInfo",
        //         parameters: {
        //             "keys": ["modelName", "firmwareVersion", "UHD", "sdkVersion", "boardType"]
        //         },
        //         onComplete: function (inResponse) {
        //             var isSucceeded = inResponse.returnValue;
        //             if (isSucceeded) {
        //                 callback(inResponse);
        //             } else {
        //                 callback(null);
        //                 return;
        //             }
        //         }
        //     });
        // }

        function isThisAPISupported(APIName, failureCallback, afterCheckedCallback) {
            getCurrentDevicewebOSVersion(function () {
                var neededwebOSVersion = PRIVATE.PlatformChecker.checkPlatformSupportedThisAPI(APIName);
                // if ((PLATFORM_INFO.webOSVersion === -2) || (PLATFORM_INFO.webOSVersion === undefined)) {
                //     PRIVATE.CallbackHandler.callFailureCallback(failureCallback, {}, Custom.ERROR_CODE.COMMON.INTERNAL_ERROR,
                //         "Cannot get webOS Signage version yet. Please try later after about 1 second.");
                //     return;
                // }
                if (PLATFORM_INFO.webOSVersion === -1) {
                    PRIVATE.CallbackHandler.callFailureCallback(failureCallback, {}, Custom.ERROR_CODE.COMMON.INTERNAL_ERROR,
                        "Unknown webOS Signage version.");
                    return;
                }
                if (neededwebOSVersion === false) {
                    PRIVATE.CallbackHandler.callFailureCallback(failureCallback, {}, Custom.ERROR_CODE.COMMON.BAD_PARAMETERS,
                        "Cannot found called API in CustomJS.");
                    return;
                }
                else if ((neededwebOSVersion !== true) && (typeof neededwebOSVersion === 'number')) {
                    PRIVATE.CallbackHandler.callFailureCallback(failureCallback, {}, Custom.ERROR_CODE.COMMON.OLD_WEBOS_VERSION,
                        "webOS Signage " + PLATFORM_INFO.webOSVersion.toFixed(1) + " doesn't support " + APIName + " API. "
                        + "webOS Signage version should be later than " + neededwebOSVersion.toFixed(1) + '.');
                    return;
                }
                afterCheckedCallback(true);
            })
        }

        /**
         * Get application ID
         */
        function getApplicationID() {
            if (window.PalmSystem) {
                return PalmSystem.identifier.split(" ")[0]
            }
            else {
                var src = location.href;
                if (src.indexOf(Custom.APPLICATION.IPK_TYPE) !== -1) {
                    return Custom.APPLICATION.IPK_TYPE
                }
                else if (src.indexOf(Custom.APPLICATION.ZIP_TYPE + '.debug') !== -1) {
                    return Custom.APPLICATION.ZIP_TYPE + '.debug'
                }
                else if (src.indexOf(Custom.APPLICATION.ZIP_TYPE) !== -1) {
                    return Custom.APPLICATION.ZIP_TYPE
                }
                else {
                    return '__UNKNOWN__';
                }
            }
        }


        /**
         * Get media ID
         * parameters : {
         *     videoEl : videoElement
         * }
         */
        // luna://com.webos.service.commercial.signage.storageservice/video/getMediaID will be removed (AFT)
        function getMediaID(successCallback, failureCallback, parameters) {
            if (parameters.videoEl && (typeof parameters.videoEl === 'object')) {

                function getMeidaIdEventFunction() {
                    // Video element is inputted
                    // Get media ID
                    if ((parameters.videoEl.mediaId) && (typeof parameters.videoEl.mediaId === 'string')) {
                        successCallback(parameters.videoEl.mediaId);
                    }
                    else {
                        // Cannot found
                        failureCallback({
                            errorCode: Custom.ERROR_CODE.COMMON.INTERNAL_ERROR,
                            errorText: "Cannot found video element."
                        });
                    }
                }

                if (parameters.videoEl.readyState > 3) {
                    getMeidaIdEventFunction();
                }
                else {
                    failureCallback({
                        returnValue: false,
                        errorCode: Custom.ERROR_CODE.COMMON.INTERNAL_ERROR,
                        errorText: "Video is not loaded yet. Try again after video is loaded."
                    })
                }
            }
            else {
                // Video element is not inputted (default)
                webOS.Request("luna://com.webos.service.commercial.signage.storageservice/video/", {
                    method: 'getMediaID',
                    onSuccess: function (successObject) {
                        if (successObject.hasOwnProperty("id")) {
                            successCallback(successObject.id);
                        }
                        else {
                            failureCallback({
                                returnValue: false,
                                errorCode: Custom.ERROR_CODE.COMMON.INTERNAL_ERROR,
                                errorText: "Failed to check media id value."
                            });
                        }
                    },
                    onFailure: function (errorObject) {
                        // If Luna API is not exists
                        var videoTag = document.getElementsByTagName('video')[0];
                        if (videoTag) {
                            successCallback(videoTag.mediaId);
                        }
                        failureCallback(errorObject);
                    }
                });
            }
        }
        /**
         * Get debug mode is enabled or not
         */
        function getDebugMode(successCallback, failureCallback) {
            webOS.Request("palm://com.palm.service.devmode", {
                method: 'getDevMode',
                parameters: {},
                onSuccess: function (successObject) {
                    successCallback(successObject.enabled);
                },
                onFailure: function (errorObject) {
                    failureCallback(errorObject);
                }
            });
        }

        /**
         * Get ZIP type application launch URI
         */

        function getZIPTypeLaunchURI(successCallback, failureCallback) {
            PRIVATE.DBHandler.getValue(CATEGORY.COMMERCIAL, ["serverIpPort", "siServerIp", "secureConnection", "appLaunchMode", "fqdnAddr", "fqdnMode"],
                function (returnObject) {
                    var applicationURI = '';
                    if (returnObject.appLaunchMode === 'none') {
                        failureCallback({
                            errorCode: Custom.ERROR_CODE.APPLICATION.SETTINGS_ERROR,
                            errorText: 'Application launch mode is NONE. Set SI Server settings first.'
                        });
                    }
                    else if (returnObject.appLaunchMode === 'local') {
                        applicationURI = 'file:////mnt/lg/appstore/scap/procentric/scap/application/app/index.html';
                    }
                    else if (returnObject.appLaunchMode === 'usb') {
                        applicationURI = 'file:////tmp/usb/sda/sda/index.html'
                    }
                    else if (returnObject.appLaunchMode === 'remote') {
                        if (returnObject.fqdnMode === 'on') {
                            applicationURI = returnObject.fqdnAddr;
                        }
                        else if (returnObject.fqdnMode === 'off') {
                            if (returnObject.secureConnection === 'on') {
                                applicationURI += 'http://' + returnObject.siServerIp + ':' + returnObject.serverIpPort + '/procentric/scap/application/index.html';
                            }
                            else if (returnObject.secureConnection === 'on') {
                                applicationURI += 'https://' + returnObject.siServerIp + ':' + returnObject.serverIpPort + '/procentric/scap/application/index.html';
                            }
                            else {
                                failureCallback({
                                    errorCode: Custom.ERROR_CODE.COMMON.INTERNAL_ERROR,
                                    errorText: 'Failed to get application installation settings.'
                                });
                            }
                        }
                        else {
                            failureCallback({
                                errorCode: Custom.ERROR_CODE.COMMON.INTERNAL_ERROR,
                                errorText: 'Failed to get application installation settings.'
                            });
                        }
                    }
                    else {
                        failureCallback({
                            errorCode: Custom.ERROR_CODE.COMMON.INTERNAL_ERROR,
                            errorText: 'Failed to get application installation settings.'
                        });
                    }
                    successCallback(applicationURI);
                },
                function (errorObject) {
                    failureCallback(errorObject);
                }
            )
        };

        /**
         * @version 1.0
         * @namespace Custom#Configuration
         * @description APIs that set or get specific settings, or change settings.
         */
        Custom.prototype.Configuration = {

            //////////////////////////////////////////////////////////////////////////	180905 iamjunyoung.park
            /**
             * @version 1.2180905
             * @since webOS Signage 3.2
             * @function Custom#Configuration#getPortControl
             * @description Gets network port block.
             * @example <caption>Gets Enterprise code.</caption>
             * // Gets white balance value.
             * function getPortControl() {
             * 		var custom = new Custom();
             * 		custom.Configuration.getPortControl( 
             * 			function successCallback(successObject) {
             *              for(var i=0; i<successObject.blockedPortList.length; i++) {
             *                  var portNumber = successObject.blockedPortList[i].blockedPort,
             *                      protocol   = successObject.blockedPortList[i].protocol;
             *                  console.log('Blocked port : ' + portNumber);
             *                  console.log('Protocol     : ' + protocol);
             *              }
             * 			},
             * 			function failureCallback(failureObject) {
             * 				console.error('[' + failureObject.errorCode + '] ' + failureObject.errorText);
             * 			}
             * 		);
             * }
             * @param {function} successCallback - Callback function if getPortControl() is called successfully successfully.
             *                                <br> If its callback is called, you can handle argument object with following properties:
             * @param {array} successCallback.blockedPortList - Array list that blocked port. Each element is object type which has "blockedPort" property.
             * @param {function} failureCallback - Callback function when error is occurred during getPortControl() is called.
             *                                <br> If its callback is called, you can handle argument object with following properties:
             * @param {string} failureCallback.errorCode - Error code.
             * @param {string} failureCallback.errorText - Error text. 
             * 
             */

            getPortControl: function getPortControl(successCallback, failureCallback, _parameters) {
                isThisAPISupported('getPortControl', failureCallback, function () {

                    // luna-send -n -P -f luna://com.webos.settingsservice/getSystemSettings '{"key":"blockedPortList","category":"commercial"}'
                    PRIVATE.DBHandler.getValue(CATEGORY.COMMERCIAL, [KEYS.BLOCKED_PORT_LIST],
                        function successCb(returnObject) {
                            if (typeof returnObject.blockedPortList === 'string') returnObject.blockedPortList = parseInt(returnObject.blockedPortList);
                            PRIVATE.CallbackHandler.callSuccessCallback(successCallback, { blockedPortList: returnObject.blockedPortList });
                        },
                        function failureCb(errorObject) {
                            PRIVATE.CallbackHandler.callFailureCallback(failureCallback, errorObject, Custom.ERROR_CODE.COMMON.INTERNAL_ERROR, 'Failed to get AvSync Bypass status.');
                        }
                    );
                });
            },


            //////////////////////////////////////////////////////////////////////////	180905 iamjunyoung.park
            /**
             * @version 1.2180905
             * @since webOS Signage 3.2
             * @function Custom#Configuration#setPortControl
             * @description Sets network port block.
             * @example <caption>Sets Enterprise code.</caption>
             *  // Sets network port block.
             *  function setPortControl() {
             *      var custom = new Custom();
             *      custom.Configuration.setPortControl(
             *          function successCallback() {
             *              console.log('Network ports are blocked.');
             *          },
             *          function failureCallback(failureObject) {
             *              console.error('[' + failureObject.errorCode + '] ' + failureObject.errorText);
             *          },
             *          {
             *              blockedPortList: [
             *                  { blockedPort : 6980, protocol: 'udp' },
             *                  { blockedPort : 9998, protocol: 'tcp' },
             *                  { blockedPort : 9080, protocol: 'tcp' }
             *              ]
             *          }
             *      );
             *  }
             * @param {function} successCallback - Callback function if setPortControl() is called successfully without any argument object.
             * @param {function} failureCallback - Callback function when error is occurred during setPortControl() is called.
             *                                <br> If its callback is called, you can handle argument object with following properties:
             * @param {string} failureCallback.errorCode - Error code.
             * @param {string} failureCallback.errorText - Error text. 
             * @param {object} parameters
             * @param {array} parameters.blockedPortList - Array list to block port. Each element is object type which has "blockedPort" property.
             */

            setPortControl: function setPortControl(successCallback, failureCallback, _parameters) {
                isThisAPISupported('setPortControl', failureCallback, function () {

                    if (PRIVATE.ParameterChecker.checkMissingParameters(_parameters, ['blockedPortList']) === false) {
                        PRIVATE.CallbackHandler.callFailureCallback(failureCallback, {}, Custom.ERROR_CODE.COMMON.BAD_PARAMETERS, 'Missing required parameters.');
                        return;
                    }

                    // Convert number to string. Below luna api works only if blockedPort value type is string
                    for (var i = 0; i < _parameters.blockedPortList.length; i++) {
                        _parameters.blockedPortList[i].blockedPort = _parameters.blockedPortList[i].blockedPort.toString();
                    }

                    //  luna-send -n -P -f luna://com.webos.settingsservice/setSystemSettings
                    // '{"settings":{"blockedPortList":[{"blockedPort":"65","protocol":"tcp"},{"blockedPort":"45","protocol":"tcp"}]},"category":"commercial"}'

                    PRIVATE.DBHandler.setValue(CATEGORY.COMMERCIAL, _parameters,
                        function (successObject) {
                            PRIVATE.CallbackHandler.callSuccessCallback(successCallback)
                        },
                        function (errorObject) {
                            PRIVATE.CallbackHandler.callFailureCallback(failureCallback, errorObject, Custom.ERROR_CODE.COMMON.INTERNAL_ERROR, 'Failed to set white balance settings.');
                        }
                    );
                });
            },

            //////////////////////////////////////////////////////////////////////////	180305 iamjunyoung.park
            /**
             * @version 1.2180305
             * @since webOS Signage 3.2
             * @function Custom#Configuration#setEnterpriseCode
             * @description Sets Enterprise code. After setting Enterprise code, device automatically reboot.
             *         <br> For disabling Enterprise code, do factory reset device manually.
             * @example <caption>Sets Enterprise code.</caption>
             *  // Sets Enterprise code.
             *  function setEnterpriseCode() {
             *      var custom = new Custom();
             *      custom.Configuration.setEnterpriseCode(
             *          function successCallback() {
             *              console.log('EnterpriseCode is set.');
             *          },
             *          function failureCallback(failureObject) {
             *              console.error('[' + failureObject.errorCode + '] ' + failureObject.errorText);
             *          },
             *          {
             *              enterpriseCode: "123456"
             *          }
             *      );
             *  }
             * @param {function} successCallback - Callback function if setEnterpriseCode() is called successfully without any argument object.
             * @param {function} failureCallback - Callback function when error is occurred during setEnterpriseCode() is called.
             *                                <br> If its callback is called, you can handle argument object with following properties:
             * @param {string} failureCallback.errorCode - Error code.
             * @param {string} failureCallback.errorText - Error text. 
             * @param {object} parameters
             * @param {string} parameters.enterpriseCode - Enterprise code.
             */

            setEnterpriseCode: function setEnterpriseCode(successCallback, failureCallback, _parameters) {
                isThisAPISupported('setEnterpriseCode', failureCallback, function () {

                    if (PRIVATE.ParameterChecker.checkMissingParameters(_parameters, ['enterpriseCode']) === false) {
                        PRIVATE.CallbackHandler.callFailureCallback(failureCallback, {}, Custom.ERROR_CODE.COMMON.BAD_PARAMETERS, 'Missing required parameters.');
                        return;
                    }

                    PRIVATE.DBHandler.setValue(CATEGORY.COMMERCIAL, _parameters,
                        function (successObject) {
                            PRIVATE.CallbackHandler.callSuccessCallback(successCallback)
                        },
                        function (errorObject) {
                            PRIVATE.CallbackHandler.callFailureCallback(failureCallback, errorObject, Custom.ERROR_CODE.COMMON.INTERNAL_ERROR, 'Failed to set white balance settings.');
                        }
                    );
                });
            },


            //////////////////////////////////////////////////////////////////////////	180102 hyunsung07.lee
            /**
             * @version 1.1180102
             * @since webOS Signage 3.0
             * @function Custom#Configuration#clearBrowsingData
             * @see Custom#CLEARBROWSINGDATATYPES
             * @description Clear browsing data. *Note. It works only in 'zip' type application.*
             * @example <caption>Clear browsing data.</caption>
             *  // Clear browsing data.
             *  function clearBrowsingData() {
             *      var custom = new Custom();
             *      custom.Configuration.clearBrowsingData(
             *          function successCallback() {
             *              console.log('clearBrowsingData is operated.');
             *          },
             *          function failureCallback(failureObject) {
             *              console.error('[' + failureObject.errorCode + '] ' + failureObject.errorText);
             *          },
             *          {
             *              types : [
             *                  Custom.CLEARBROWSINGDATATYPES.ALL, 
             *                  Custom.CLEARBROWSINGDATATYPES.APPCACHE, 
             *                  Custom.CLEARBROWSINGDATATYPES.CACHE,
             *                  Custom.CLEARBROWSINGDATATYPES.CHANNELIDS,
             *                  Custom.CLEARBROWSINGDATATYPES.COOKIES,
             *                  Custom.CLEARBROWSINGDATATYPES.FILESYSTEMS,
             *                  Custom.CLEARBROWSINGDATATYPES.INDEXEDDB,
             *                  Custom.CLEARBROWSINGDATATYPES.LOCALSTORAGE,
             *                  Custom.CLEARBROWSINGDATATYPES.SERVICEWORKERS,
             *                  Custom.CLEARBROWSINGDATATYPES.WEBSQL
             *               ]
             *          }
             *      );
             *  }
             * @param {function} successCallback - Callback function if clearBrowsingData() is called successfully without any argument object.
             * @param {function} failureCallback - Callback function when error is occurred during clearBrowsingData() is called.
             *                                <br> If its callback is called, you can handle argument object with following properties:
             * @param {string} failureCallback.errorCode - Error code.
             * @param {string} failureCallback.errorText - Error text. 
             * @param {object} parameters
             * @param {array} parameters.types - An array of browsing data types to remove.
             *                              <br> Default value is ["all"].
             *                              <br> Empty array removes nothing.
             *                              <br> See Custom#CLEARBROWSINGDATATYPES for more detail.
             */

            clearBrowsingData: function clearBrowsingData(successCallback, failureCallback, _parameters) {
                isThisAPISupported('clearBrowsingData', failureCallback, function () {

                    if (PRIVATE.ParameterChecker.checkMissingParameters(_parameters, ['types']) === false) {
                        PRIVATE.CallbackHandler.callFailureCallback(failureCallback, {}, Custom.ERROR_CODE.COMMON.BAD_PARAMETERS, 'Missing required parameters.');
                        return;
                    }

                    if (PRIVATE.ParameterChecker.checkMulltiParametersValidation(Custom.CLEARBROWSINGDATATYPES, _parameters, 'types') === false) {
                        PRIVATE.CallbackHandler.callFailureCallback(failureCallback, {}, Custom.ERROR_CODE.COMMON.BAD_PARAMETERS, 'Invalid parameters.');
                        return;
                    }

                    // luna-send -n 1 palm://com.palm.webappmanager/clearBrowsingData '{"types":["cache"]}'
                    webOS.Request("palm://com.palm.webappmanager/", {
                        method: "clearBrowsingData",
                        parameters: _parameters,
                        onSuccess: function (successObject) {
                            PRIVATE.CallbackHandler.callSuccessCallback(successCallback)
                        },
                        onFailure: function (errorObject) {
                            PRIVATE.CallbackHandler.callFailureCallback(failureCallback, errorObject, Custom.ERROR_CODE.COMMON.INTERNAL_ERROR, 'Failed to clear browsing data.');
                        }
                    });

                });
            },

            /**
             * @version 1.1180115
             * @since webOS Signage 1.0
             * @function Custom#Configuration#setWhiteBalanceRGB
             * @see Custom#Configuration#getWhiteBalanceRGB
             * @description Sets RGB value of white balance.
             * @example <caption>Sets each #-Gain value.</caption>
             * // Sets white balance value.
             * function setWhiteBalanceRGB() {
             * 		var custom = new Custom();
             * 		custom.Configuration.setWhiteBalanceRGB( 
             * 			function successCallback() {
             * 				console.log('White balance adjusted.');
             * 			},
             * 			function failureCallback(failureObject) {
             * 				console.error('[' + failureObject.errorCode + '] ' + failureObject.errorText);
             * 			},
             * 			{
             * 				rGain :  0,
             *              gGain :  2,
             *              bGain : -3
             * 			}
             * 		);
             * }
             * @param {function} successCallback - Callback function if setWhiteBalanceRGB() is called successfully without any argument object.
             * @param {function} failureCallback - Callback function when error is occurred during setWhiteBalanceRGB() is called.
             *                                <br> If its callback is called, you can handle argument object with following properties:
             * @param {string} failureCallback.errorCode - Error code.
             * @param {string} failureCallback.errorText - Error text. 
             * @param {object} parameters
             * @param {number} [parameters.rGain] - R-Gain value of white balance. One of #-Gain value must be used.
             * @param {number} [parameters.gGain] - G-Gain value of white balance. One of #-Gain value must be used.
             * @param {number} [parameters.bGain] - B-Gain value of white balance. One of #-Gain value must be used.
             * 
             */
            setWhiteBalanceRGB: function setWhiteBalanceRGB(successCallback, failureCallback, parameters) {
                isThisAPISupported('setWhiteBalanceRGB', failureCallback, function () {
                    // rGain, gBain, bGain is optional parameters, but at least 1 value should be used
                    if ((false === parameters.hasOwnProperty('rGain')) &&
                        (false === parameters.hasOwnProperty('gGain')) &&
                        (false === parameters.hasOwnProperty('bGain'))) {
                        PRIVATE.CallbackHandler.callFailureCallback(failureCallback, {}, Custom.ERROR_CODE.COMMON.BAD_PARAMETERS,
                            'Missing required parameters. At least one of rGain, gGain or bGain parameter should be used.');
                        return;
                    }

                    if (((true === parameters.hasOwnProperty('rGain')) && (typeof parameters.rGain !== 'number')) ||
                        ((true === parameters.hasOwnProperty('gGain')) && (typeof parameters.gGain !== 'number')) ||
                        ((true === parameters.hasOwnProperty('bGain')) && (typeof parameters.bGain !== 'number'))) {
                        PRIVATE.CallbackHandler.callFailureCallback(failureCallback, {}, Custom.ERROR_CODE.COMMON.BAD_PARAMETERS,
                            'Invalid parameters. r/g/bGain value type must be number.');
                        return;
                    }

                    // webOS Signage 1.0 to 3.0
                    if (PLATFORM_INFO.webOSVersion <= 3.0) {
                        // luna-send -n 1 -f palm://com.webos.settingsservice/getSystemSettings '{"category":"picture", "keys":["pictureMode"]}'
                        PRIVATE.DBHandler.getValue(CATEGORY.PICTURE, [KEYS.PICTUREMODE],
                            function (successGet) {
                                var param = {};
                                switch (successGet.pictureMode) {
                                    case 'normal':
                                        if (typeof parameters.rGain === 'number') { param.rSubGainMedium = parameters.rGain; }
                                        if (typeof parameters.gGain === 'number') { param.gSubGainMedium = parameters.gGain; }
                                        if (typeof parameters.bGain === 'number') { param.bSubGainMedium = parameters.bGain; }
                                        break;
                                    case 'vivid':
                                        if (typeof parameters.rGain === 'number') { param.rSubGainCool = parameters.rGain; }
                                        if (typeof parameters.gGain === 'number') { param.gSubGainCool = parameters.gGain; }
                                        if (typeof parameters.bGain === 'number') { param.bSubGainCool = parameters.bGain; }
                                        break;
                                    case 'cinema':
                                        if (typeof parameters.rGain === 'number') { param.rSubGainWarm = parameters.rGain; }
                                        if (typeof parameters.gGain === 'number') { param.gSubGainWarm = parameters.gGain; }
                                        if (typeof parameters.bGain === 'number') { param.bSubGainWarm = parameters.bGain; }
                                        break;
                                    default:
                                        PRIVATE.CallbackHandler.callFailureCallback(failureCallback, {}, Custom.ERROR_CODE.CONFIGURATION.INVALID_CONFIG,
                                            'This API supports only if picture mode is Vivid, Standard or Cinema.');
                                        return;
                                }
                                // luna-send -n 1 -f palm://com.webos.settingsservice/getSystemSettings '{"category":"commercial", "settings":{"rSubGainXXXX":-7,"gSubGainXXXX":0,"bSubGainXXXX":0}}}'
                                PRIVATE.DBHandler.setValue(CATEGORY.COMMERCIAL, param,
                                    function (successObject) {
                                        PRIVATE.CallbackHandler.callSuccessCallback(successCallback)
                                    },
                                    function (errorObject) {
                                        PRIVATE.CallbackHandler.callFailureCallback(failureCallback, errorObject, Custom.ERROR_CODE.COMMON.INTERNAL_ERROR, 'Failed to set white balance settings.');
                                    });
                            },
                            function (failureGet) {
                                PRIVATE.CallbackHandler.callFailureCallback(failureCallback, errorObject, Custom.ERROR_CODE.COMMON.INTERNAL_ERROR, 'Failed to set white balance settings.');
                            }
                        )
                    }
                    // From webOS Signage 3.2
                    else {
                        PRIVATE.DBHandler.getValue(CATEGORY.PICTURE, [KEYS.PICTUREMODE],
                            function (successGet) {
                                var param = {};
                                switch (successGet.pictureMode) {
                                    case 'normal': // General
                                    case 'vivid': // Mall/QSR
                                    case 'sports': // Transportation
                                    case 'game': // Education
                                    case 'govCorp': // Gov./Corp
                                    case 'eco': // APS
                                        if (typeof parameters.rGain === 'number') { param.redOffset = parameters.rGain; }
                                        if (typeof parameters.gGain === 'number') { param.greenOffset = parameters.gGain; }
                                        if (typeof parameters.bGain === 'number') { param.blueOffset = parameters.bGain; }
                                        break;
                                    default:
                                        PRIVATE.CallbackHandler.callFailureCallback(failureCallback, {}, Custom.ERROR_CODE.CONFIGURATION.INVALID_CONFIG,
                                            'This API is not supports when picture mode is Calibration.');
                                        return;
                                }
                                // luna-send -n 1 -f palm://com.webos.settingsservice/getSystemSettings '{"category":"commercial", "settings":{"redOffset":-7,"greenOffset":0,"blueOffset":0}}}'
                                PRIVATE.DBHandler.setValue(CATEGORY.PICTURE, param,
                                    function (successObject) {
                                        PRIVATE.CallbackHandler.callSuccessCallback(successCallback);
                                    },
                                    function (errorObject) {
                                        PRIVATE.CallbackHandler.callFailureCallback(failureCallback, errorObject, Custom.ERROR_CODE.COMMON.INTERNAL_ERROR, 'Failed to set white balance settings.');
                                    });
                            },
                            function (failureGet) {
                                PRIVATE.CallbackHandler.callFailureCallback(failureCallback, failureGet, Custom.ERROR_CODE.COMMON.INTERNAL_ERROR, 'Failed to set white balance settings.');
                            }
                        )
                    };
                });
            },

            /**
             * @version 1.1180115
             * @since webOS Signage 1.0
             * @function Custom#Configuration#getWhiteBalanceRGB
             * @see Custom#Configuration#setWhiteBalanceRGB
             * @description Gets RGB value of white balance.
             * @example <caption>Gets each #-Gain value.</caption>
             * // Gets white balance value.
             * function getWhiteBalanceRGB() {
             * 		var custom = new Custom();
             * 		custom.Configuration.getWhiteBalanceRGB( 
             * 			function successCallback(successObject) {
             *              console.log('White Balance : ' + JSON.stringify(successObject, null, 4));
             * 			},
             * 			function failureCallback(failureObject) {
             * 				console.error('[' + failureObject.errorCode + '] ' + failureObject.errorText);
             * 			}
             * 		);
             * }
             * @param {function} successCallback - Callback function if getWhiteBalanceRGB() is called successfully successfully.
             *                                <br> If its callback is called, you can handle argument object with following properties:
             * @param {number} successCallback.rGain - Current red gain value of white balance.
             * @param {number} successCallback.gGain - Current green gain value of white balance.
             * @param {number} successCallback.bGain - Current blue gain value of white balance.
             * @param {function} failureCallback - Callback function when error is occurred during setWhiteBalanceRGB() is called.
             *                                <br> If its callback is called, you can handle argument object with following properties:
             * @param {string} failureCallback.errorCode - Error code.
             * @param {string} failureCallback.errorText - Error text. 
             * 
             */
            getWhiteBalanceRGB: function getWhiteBalanceRGB(successCallback, failureCallback) {
                isThisAPISupported('getWhiteBalanceRGB', failureCallback, function () {
                    // webOS Signage 1.0 to 3.0
                    if (PLATFORM_INFO.webOSVersion <= 3.0) {
                        PRIVATE.DBHandler.getValue(CATEGORY.PICTURE, [KEYS.PICTUREMODE],
                            function (pictureModeObj) {
                                // luna-send -n 1 -f palm://com.webos.settingsservice/getSystemSettings '{"category":"picture", "keys":["pictureMode"]}'
                                PRIVATE.DBHandler.getValue(CATEGORY.COMMERCIAL, [
                                    "rSubGainMedium", "gSubGainMedium", "bSubGainMedium", // Standard
                                    "rSubGainCool", "gSubGainCool", "bSubGainCool", // Vivid
                                    "rSubGainWarm", "gSubGainWarm", "bSubGainWarm"], // Cinema
                                    function (wbObj) {
                                        var returnObject = {};
                                        switch (pictureModeObj.pictureMode) {
                                            case 'normal':
                                                returnObject.rGain = wbObj.rSubGainMedium;
                                                returnObject.gGain = wbObj.gSubGainMedium;
                                                returnObject.bGain = wbObj.bSubGainMedium;
                                                break;
                                            case 'vivid':
                                                returnObject.rGain = wbObj.rSubGainCool;
                                                returnObject.gGain = wbObj.gSubGainCool;
                                                returnObject.bGain = wbObj.bSubGainCool;
                                                break;
                                            case 'cinema':
                                                returnObject.rGain = wbObj.rSubGainWarm;
                                                returnObject.gGain = wbObj.gSubGainWarm;
                                                returnObject.bGain = wbObj.bSubGainWarm;
                                                break;
                                            default:
                                                PRIVATE.CallbackHandler.callFailureCallback(failureCallback, {}, Custom.ERROR_CODE.CONFIGURATION.INVALID_CONFIG,
                                                    'This API supports only if picture mode is Vivid, Standard or Cinema.');
                                                return;
                                        }
                                        if (typeof returnObject.rGain === 'string') returnObject.rGain = parseInt(returnObject.rGain);
                                        if (typeof returnObject.gGain === 'string') returnObject.gGain = parseInt(returnObject.gGain);
                                        if (typeof returnObject.bGain === 'string') returnObject.bGain = parseInt(returnObject.bGain);
                                        PRIVATE.CallbackHandler.callSuccessCallback(successCallback, returnObject);
                                    },
                                    function (failureGet) {
                                        PRIVATE.CallbackHandler.callFailureCallback(failureCallback, errorObject, Custom.ERROR_CODE.COMMON.INTERNAL_ERROR, 'Failed to get white balance settings.');
                                    }
                                )
                            }
                        )
                    }
                    // From webOS Signage 3.2
                    else {
                        PRIVATE.DBHandler.getValue(CATEGORY.PICTURE, [KEYS.PICTUREMODE, "redOffset", "greenOffset", "blueOffset"],
                            function (successGet) {
                                var returnObject = {};
                                switch (successGet.pictureMode) {
                                    case 'normal': // General
                                    case 'vivid': // Mall/QSR
                                    case 'sports': // Transportation
                                    case 'game': // Education
                                    case 'govCorp': // Cov./Corp
                                    case 'eco': // APS
                                        returnObject.rGain = successGet.redOffset;
                                        returnObject.gGain = successGet.greenOffset;
                                        returnObject.bGain = successGet.blueOffset;
                                        break;
                                    default:
                                        PRIVATE.CallbackHandler.callFailureCallback(failureCallback, {}, Custom.ERROR_CODE.CONFIGURATION.INVALID_CONFIG,
                                            'This API is not supports when picture mode is Calibration.');
                                        return;
                                }
                                if (typeof returnObject.rGain === 'string') returnObject.rGain = parseInt(returnObject.rGain);
                                if (typeof returnObject.gGain === 'string') returnObject.gGain = parseInt(returnObject.gGain);
                                if (typeof returnObject.bGain === 'string') returnObject.bGain = parseInt(returnObject.bGain);
                                PRIVATE.CallbackHandler.callSuccessCallback(successCallback, returnObject);
                            },
                            function (failureGet) {
                                PRIVATE.CallbackHandler.callFailureCallback(failureCallback, failureGet, Custom.ERROR_CODE.COMMON.INTERNAL_ERROR, 'Failed to get white balance settings.');
                            }
                        )
                    };
                });
            },

            /**
             * @version 1.1180102
             * @since webOS Signage 2.0
             * @function Custom#Configuration#setAvSync
             * @see Custom#Configuration#getAvSync
             * @see Custom#AVSYNC
             * @description Sets AvSync.
             * @example <caption>Sets AvSync.</caption>
             * // Sets AV Sync Status.
             * function setAvSync() {
             * 		var custom = new Custom();
             * 		custom.Configuration.setAvSync( 
             * 			function successCallback() {
             * 				console.log('AV Sync is set.');
             * 			},
             * 			function failureCallback(failureObject) {
             * 				console.error('[' + failureObject.errorCode + '] ' + failureObject.errorText);
             * 			},
             * 			{
             * 				avSync : Custom.AVSYNC.ON
             * 			}
             * 		);
             * }
             * @param {function} successCallback - Callback function if setAvSync() is called successfully without any argument object.
             * @param {function} failureCallback - Callback function when error is occurred during setAvSync() is called.
             *                                <br> If its callback is called, you can handle argument object with following properties:
             * @param {string} failureCallback.errorCode - Error code.
             * @param {string} failureCallback.errorText - Error text. 
             * @param {object} parameters - Sets AvSyncAdjustment value. See Custom#AVSYNC for more detail.
             * @param {object} parameters. - Sets AvSyncAdjustment value. See Custom#AVSYNC for more detail.
             */
            setAvSync: function setAvSync(successCallback, failureCallback, parameters) {
                isThisAPISupported('setAvSync', failureCallback, function () {

                    if (PRIVATE.ParameterChecker.checkMissingParameters(parameters, ['avSync']) === false) {
                        PRIVATE.CallbackHandler.callFailureCallback(failureCallback, {}, Custom.ERROR_CODE.COMMON.BAD_PARAMETERS, 'Missing required parameters.');
                        return;
                    }

                    if (PRIVATE.ParameterChecker.checkParametersValidation(Custom.AVSYNC, parameters, 'avSync') === false) {
                        PRIVATE.CallbackHandler.callFailureCallback(failureCallback, {}, Custom.ERROR_CODE.COMMON.BAD_PARAMETERS, 'Invalid parameters.');
                        return;
                    }
                    // luna-send -n 1 -f luna://com.webos.settingsservice/setSystemSettings '{"category":"sound", "settings":{"avSync":"on"}}'
                    PRIVATE.DBHandler.setValue(CATEGORY.SOUND, parameters,
                        function (successObject) {
                            PRIVATE.CallbackHandler.callSuccessCallback(successCallback)
                        },
                        function (errorObject) {
                            PRIVATE.CallbackHandler.callFailureCallback(failureCallback, errorObject, Custom.ERROR_CODE.COMMON.INTERNAL_ERROR, 'Failed to set AvSync settings.');
                        });
                });
            },

            /**
             * @version 1.1180102
             * @since webOS Signage 2.0
             * @function Custom#Configuration#getAvSync
             * @see Custom#Configuration#setAvSync
             * @see Custom#AVSYNC
             * @description Gets AvSync Status.
             * @example <caption>Gets AvSync Status.</caption>
             * // Gets AvSync Status.
             * var custom = new Custom();
             * custom.Configuration.getAvSync(
             *     function successCallback(successObject) {
             *         console.log('AvSync Status : ' + successObject.avSync);
             *     },
             *     function failureCallback(failureObject) {
             *         console.error('[' + failureObject.errorCode + '] ' + failureObject.errorText);
             *     }
             * );
             * @param {function} successCallback - Callback function if getAvSync() is called successfully successfully.
             *                                <br> If its callback is called, you can handle argument object with following properties:
             * @param {string} successCallback.avSync - Current value of AvSync status.
             * @param {function} failureCallback - Callback function when error is occurred during getAvSync() is called.
             *                                <br> If its callback is called, you can handle argument object with following properties:
             * @param {string} failureCallback.errorCode - Error code.
             * @param {string} failureCallback.errorText - Error text. 
             */
            getAvSync: function getAvSync(successCallback, failureCallback) {
                isThisAPISupported('getAvSync', failureCallback, function () {

                    // luna-send -n 1 -f palm://com.webos.settingsservice/getSystemSettings '{"category":"sound", "keys":["avSync"]}'
                    PRIVATE.DBHandler.getValue(CATEGORY.SOUND, [KEYS.AVSYNC],
                        function successCb(returnObject) {
                            PRIVATE.CallbackHandler.callSuccessCallback(successCallback, { avSync: returnObject.avSync });
                        },
                        function failureCb(errorObject) {
                            PRIVATE.CallbackHandler.callFailureCallback(failureCallback, errorObject, Custom.ERROR_CODE.COMMON.INTERNAL_ERROR, 'Failed to get AvSync status.');
                        }
                    );
                });
            },

            /**
             * @version 1.1180102
             * @since webOS Signage 2.0
             * @function Custom#Configuration#setAvSyncSpeaker
             * @see Custom#Configuration#getAvSyncSpeaker
             * @see Custom#AVSYNCSPEAKER
             * @description Sets AvSync Speaker.
             * @example <caption>Sets AvSync Speaker.</caption>
             * // Sets AV Sync Speaker Status.
             * function setAvSyncSpeaker() {
             * 		var custom = new Custom();
             * 		custom.Configuration.setAvSyncSpeaker( 
             * 			function successCallback() {
             * 				console.log('AV Sync Speaker is set.');
             * 			},
             * 			function failureCallback(failureObject) {
             * 				console.error('[' + failureObject.errorCode + '] ' + failureObject.errorText);
             * 			},
             * 			{
             * 				avSyncSpeaker : -5		// avSyncSpeaker : -5 ~ 15
             * 			}
             * 		);
             * }
             * @param {function} successCallback - Callback function if setAvSyncSpeaker() is called successfully without any argument object.
             * @param {function} failureCallback - Callback function when error is occurred during setAvSyncSpeaker() is called.
             *                                <br> If its callback is called, you can handle argument object with following properties:
             * @param {string} failureCallback.errorCode - Error code.
             * @param {string} failureCallback.errorText - Error text. 
             * @param {object} parameters - Sets AvSync Speaker value. See Custom#AVSYNCSPEAKER for more detail.
             */
            setAvSyncSpeaker: function setAvSyncSpeaker(successCallback, failureCallback, parameters) {
                isThisAPISupported('setAvSyncSpeaker', failureCallback, function () {

                    if (PRIVATE.ParameterChecker.checkMissingParameters(parameters, ['avSyncSpeaker']) === false) {
                        PRIVATE.CallbackHandler.callFailureCallback(failureCallback, {}, Custom.ERROR_CODE.COMMON.BAD_PARAMETERS, 'Missing required parameters.');
                        return;
                    }

                    if (PRIVATE.ParameterChecker.checkParametersValidation(Custom.AVSYNCSPEAKER, parameters, 'avSyncSpeaker') === false) {
                        PRIVATE.CallbackHandler.callFailureCallback(failureCallback, {}, Custom.ERROR_CODE.COMMON.BAD_PARAMETERS, 'Invalid parameters.');
                        return;
                    }
                    // luna-send -n 1 -f luna://com.webos.settingsservice/setSystemSettings '{"settings":{"avSyncSpeaker":1},"category":"sound"}'
                    PRIVATE.DBHandler.setValue(CATEGORY.SOUND, parameters,
                        function (successObject) {
                            PRIVATE.CallbackHandler.callSuccessCallback(successCallback)
                        },
                        function (errorObject) {
                            PRIVATE.CallbackHandler.callFailureCallback(failureCallback, errorObject, Custom.ERROR_CODE.COMMON.INTERNAL_ERROR, 'Failed to set AvSync Speaker settings.');
                        });
                });
            },

            /**
             * @version 1.1180102
             * @since webOS Signage 2.0
             * @function Custom#Configuration#getAvSyncSpeaker
             * @see Custom#Configuration#setAvSyncSpeaker
             * @see Custom#AVSYNCSPEAKER
             * @description Gets AvSync Speaker Status.
             * @example <caption>Gets AvSync Speaker Status.</caption>
             * // Gets AvSync Speaker Status.
             * var custom = new Custom();
             * custom.Configuration.getAvSyncSpeaker(
             *     function successCallback(successObject) {
             *         console.log('AvSync Speaker Status : ' + successObject.avSyncSpeaker);
             *     },
             *     function failureCallback(failureObject) {
             *         console.error('[' + failureObject.errorCode + '] ' + failureObject.errorText);
             *     }
             * );
             * @param {function} successCallback - Callback function if getAvSyncSpeaker() is called successfully successfully.
             *                                <br> If its callback is called, you can handle argument object with following properties:
             * @param {number} successCallback.avSyncSpeaker - Current AvSync Speaker Status value.
             * @param {function} failureCallback - Callback function when error is occurred during getAvSyncSpeaker() is called.
             *                                <br> If its callback is called, you can handle argument object with following properties:
             * @param {string} failureCallback.errorCode - Error code.
             * @param {string} failureCallback.errorText - Error text. 
             */
            getAvSyncSpeaker: function getAvSyncSpeaker(successCallback, failureCallback) {
                isThisAPISupported('getAvSyncSpeaker', failureCallback, function () {

                    // luna-send -n 1 -f palm://com.webos.settingsservice/getSystemSettings '{"category":"sound", "keys":["avSyncSpeaker"]}'
                    PRIVATE.DBHandler.getValue(CATEGORY.SOUND, [KEYS.AVSYNCSPEAKER],
                        function successCb(returnObject) {
                            if (typeof returnObject.avSyncSpeaker === 'string') returnObject.avSyncSpeaker = parseInt(returnObject.avSyncSpeaker);
                            PRIVATE.CallbackHandler.callSuccessCallback(successCallback, { avSyncSpeaker: returnObject.avSyncSpeaker });
                        },
                        function failureCb(errorObject) {
                            PRIVATE.CallbackHandler.callFailureCallback(failureCallback, errorObject, Custom.ERROR_CODE.COMMON.INTERNAL_ERROR, 'Failed to get AvSync Speaker status.');
                        }
                    );
                });
            },

            /**
             * @version 1.1180102
             * @since webOS Signage 2.0
             * @function Custom#Configuration#setAvSyncBypass
             * @see Custom#Configuration#getAvSyncBypass
             * @see Custom#AVSYNCBYPASS
             * @description Sets AvSync Bypass.
             * @example <caption>Sets AvSync Bypass.</caption>
             * // Sets AV Sync Bypass Status.
             * function setAvSyncBypass() {
             * 		var custom = new Custom();
             * 		custom.Configuration.setAvSyncBypass( 
             * 			function successCallback() {
             * 				console.log('AV Sync Bypass is set.');
             * 			},
             * 			function failureCallback(failureObject) {
             * 				console.error('[' + failureObject.errorCode + '] ' + failureObject.errorText);
             * 			},
             * 			{
             * 				avSyncBypassInput : Custom.AVSYNCBYPASS.ON
             * 			}
             * 		);
             * }
             * @param {function} successCallback - Callback function if setAvSyncBypass() is called successfully without any argument object.
             * @param {function} failureCallback - Callback function when error is occurred during setAvSyncBypass() is called.
             *                                <br> If its callback is called, you can handle argument object with following properties:
             * @param {string} failureCallback.errorCode - Error code.
             * @param {string} failureCallback.errorText - Error text. 
             * @param {object} parameters - Sets AvSync Bypass value. See Custom#AVSYNCBYPASS for more detail.
             */
            setAvSyncBypass: function setAvSyncBypass(successCallback, failureCallback, parameters) {
                isThisAPISupported('setAvSyncBypass', failureCallback, function () {

                    if (PRIVATE.ParameterChecker.checkMissingParameters(parameters, ['avSyncBypassInput']) === false) {
                        PRIVATE.CallbackHandler.callFailureCallback(failureCallback, {}, Custom.ERROR_CODE.COMMON.BAD_PARAMETERS, 'Missing required parameters.');
                        return;
                    }

                    if (PRIVATE.ParameterChecker.checkParametersValidation(Custom.AVSYNCBYPASS, parameters, 'avSyncBypassInput') === false) {
                        PRIVATE.CallbackHandler.callFailureCallback(failureCallback, {}, Custom.ERROR_CODE.COMMON.BAD_PARAMETERS, 'Invalid parameters.');
                        return;
                    }
                    // luna-send -n 1 -f luna://com.webos.settingsservice/setSystemSettings '{"settings":{"avSyncBypassInput":"on"},"category":"sound"}'
                    PRIVATE.DBHandler.setValue(CATEGORY.SOUND, parameters,
                        function (successObject) {
                            PRIVATE.CallbackHandler.callSuccessCallback(successCallback)
                        },
                        function (errorObject) {
                            PRIVATE.CallbackHandler.callFailureCallback(failureCallback, errorObject, Custom.ERROR_CODE.COMMON.INTERNAL_ERROR, 'Failed to set AvSync Bypass settings.');
                        });
                });
            },

            /**
             * @version 1.1180102
             * @since webOS Signage 2.0
             * @function Custom#Configuration#getAvSyncBypass
             * @see Custom#Configuration#setAvSyncBypass
             * @see Custom#AVSYNCBYPASS
             * @description Gets AvSync Bypass Status.
             * @example <caption>Gets AvSync Bypass Status.</caption>
             * // Gets AvSync Bypass Status.
             * var custom = new Custom();
             * custom.Configuration.getAvSyncBypass(
             *     function successCallback(successObject) {
             *         console.log('AvSync Bypass Status : ' + successObject.avSyncBypassInput);
             *     },
             *     function failureCallback(failureObject) {
             *         console.error('[' + failureObject.errorCode + '] ' + failureObject.errorText);
             *     }
             * );
             * @param {function} successCallback - Callback function if getAvSyncBypass() is called successfully successfully.
             *                                <br> If its callback is called, you can handle argument object with following properties:
             * @param {string} successCallback.avSyncBypassInput - Current AvSync Bypass Status value.
             * @param {function} failureCallback - Callback function when error is occurred during getAvSyncBypass() is called.
             *                                <br> If its callback is called, you can handle argument object with following properties:
             * @param {string} failureCallback.errorCode - Error code.
             * @param {string} failureCallback.errorText - Error text. 
             */
            getAvSyncBypass: function getAvSyncBypass(successCallback, failureCallback) {
                isThisAPISupported('getAvSyncBypass', failureCallback, function () {

                    // luna-send -n 1 -f palm://com.webos.settingsservice/getSystemSettings '{"category":"sound", "keys":["avSyncBypassInput"]}'
                    PRIVATE.DBHandler.getValue(CATEGORY.SOUND, [KEYS.AVSYNCBYPASSINPUT],
                        function successCb(returnObject) {
                            PRIVATE.CallbackHandler.callSuccessCallback(successCallback, { avSyncBypassInput: returnObject.avSyncBypassInput });
                        },
                        function failureCb(errorObject) {
                            PRIVATE.CallbackHandler.callFailureCallback(failureCallback, errorObject, Custom.ERROR_CODE.COMMON.INTERNAL_ERROR, 'Failed to get AvSync Bypass status.');
                        }
                    );
                });
            },

            /**
             * @version 1.1180102
             * @since webOS Signage 3.0
             * @function Custom#Configuration#setNoSignalImageStatus
             * @see Custom#Configuration#getNoSignalImageStatus
             * @see Custom#NOSIGNALIMAGE
             * @description Sets no signal image status.
             * @example <caption>Sets no signal image status.</caption>
             * // Sets No Signal Image Status.
             * function setNoSignalImageStatus() {
             * 		var custom = new Custom();
             * 		custom.Configuration.setNoSignalImageStatus( 
             * 			function successCallback() {
             * 				console.log('No Signal Image is set.');
             * 			},
             * 			function failureCallback(failureObject) {
             * 				console.error('[' + failureObject.errorCode + '] ' + failureObject.errorText);
             * 			},
             * 			{
             * 				noSignalImage : Custom.NOSIGNALIMAGE.ON
             * 			}
             * 		);
             * }
             * @param {function} successCallback - Callback function if setNoSignalImageStatus() is called successfully without any argument object.
             * @param {function} failureCallback - Callback function when error is occurred during setNoSignalImageStatus() is called.
             *                                <br> If its callback is called, you can handle argument object with following properties:
             * @param {string} failureCallback.errorCode - Error code.
             * @param {string} failureCallback.errorText - Error text. 
             * @param {object} parameters - Sets NoSignalImage value. See Custom#NOSIGNALIMAGE for more detail.
             */
            setNoSignalImageStatus: function setNoSignalImageStatus(successCallback, failureCallback, parameters) {
                isThisAPISupported('setNoSignalImageStatus', failureCallback, function () {

                    if (PRIVATE.ParameterChecker.checkMissingParameters(parameters, ['noSignalImage']) === false) {
                        PRIVATE.CallbackHandler.callFailureCallback(failureCallback, {}, Custom.ERROR_CODE.COMMON.BAD_PARAMETERS, 'Missing required parameters.');
                        return;
                    }

                    if (PRIVATE.ParameterChecker.checkParametersValidation(Custom.NOSIGNALIMAGE, parameters, 'noSignalImage') === false) {
                        PRIVATE.CallbackHandler.callFailureCallback(failureCallback, {}, Custom.ERROR_CODE.COMMON.BAD_PARAMETERS, 'Invalid parameters.');
                        return;
                    }
                    //luna-send -n 1 -f luna://com.webos.settingsservice/setSystemSettings '{"category":"commercial", "settings": {"noSignalImage": "on"}}'
                    PRIVATE.DBHandler.setValue(CATEGORY.COMMERCIAL, parameters,
                        function (successObject) {
                            PRIVATE.CallbackHandler.callSuccessCallback(successCallback)
                        },
                        function (errorObject) {
                            PRIVATE.CallbackHandler.callFailureCallback(failureCallback, errorObject, Custom.ERROR_CODE.COMMON.INTERNAL_ERROR, 'Failed to set NoSignalImage status.');
                        });
                });
            },

            /**
             * @version 1.1180102
             * @since webOS Signage 3.0
             * @function Custom#Configuration#getNoSignalImageStatus
             * @see Custom#Configuration#setNoSignalImageStatus
             * @see Custom#getNoSignalImageStatus
             * @description Gets NoSignalImage Status.
             * @example <caption>Gets NoSignalImage Status.</caption>
             * // Gets NoSignalImage Status.
             * var custom = new Custom();
             * custom.Configuration.getNoSignalImageStatus(
             *     function successCallback(successObject) {
             *         console.log('NoSignalImage Status : ' + successObject.noSignalImage);
             *     },
             *     function failureCallback(failureObject) {
             *         console.error('[' + failureObject.errorCode + '] ' + failureObject.errorText);
             *     }
             * );
             * @param {function} successCallback - Callback function if getNoSignalImageStatus() is called successfully successfully.
             *                                <br> If its callback is called, you can handle argument object with following properties:
             * @param {string} successCallback.noSignalImage - Current NoSignalImage Status value.
             * @param {function} failureCallback - Callback function when error is occurred during getNoSignalImageStatus() is called.
             *                                <br> If its callback is called, you can handle argument object with following properties:
             * @param {string} failureCallback.errorCode - Error code.
             * @param {string} failureCallback.errorText - Error text. 
             */
            getNoSignalImageStatus: function getNoSignalImageStatus(successCallback, failureCallback) {
                isThisAPISupported('getNoSignalImageStatus', failureCallback, function () {

                    // luna-send -n 1 -f palm://com.webos.settingsservice/getSystemSettings '{"category":"commercial", "keys":["noSignalImage"]}'
                    PRIVATE.DBHandler.getValue(CATEGORY.COMMERCIAL, [KEYS.NOSIGNALIMAGE],
                        function successCb(returnObject) {
                            PRIVATE.CallbackHandler.callSuccessCallback(successCallback, { noSignalImage: returnObject.noSignalImage });
                        },
                        function failureCb(errorObject) {
                            PRIVATE.CallbackHandler.callFailureCallback(failureCallback, errorObject, Custom.ERROR_CODE.COMMON.INTERNAL_ERROR, 'Failed to get NoSignalImage status.');
                        }
                    );
                });
            },
            //////////////////////////////////////////////////////////////////////////	180102 hyunsung07.lee

            /**
             * @version 1.0170223
             * @since webOS Signage 1.0
             * @function Custom#Configuration#getPowerOnOffHistory
             * @description Gets power on/off history.
             * @example <caption>Below example will get power on/off history.</caption>
             * // Gets power on/off history.
             * var custom = new Custom();
             * custom.Configuration.getPowerOnOffHistory(
             *     function successCallback(successObject) {
             *         console.log('Power History : ' + JSON.stringify(successObject.powerOnOffHistory, null, 4));
             *     },
             *     function failureCallback(failureObject) {
             *         console.error('[' + failureObject.errorCode + '] ' + failureObject.errorText);
             *     }
             * );
             * @param {function} successCallback - Callback function if getPowerOnOffHistory() is called successfully successfully.
             *                                <br> If its callback is called, you can handle argument object with following properties:
             * @param {array} successCallback.powerOnOffHistory - Array that power on / off history.
             * @param {function} failureCallback - Callback function when error is occurred during getPowerOnOffHistory() is called.
             *                                <br> If its callback is called, you can handle argument object with following properties:
             * @param {string} failureCallback.errorCode - Error code.
             * @param {string} failureCallback.errorText - Error text. 
             */
            getPowerOnOffHistory: function getPowerOnOffHistory(successCallback, failureCallback) {
                isThisAPISupported('getPowerOnOffHistory', failureCallback, function () {
                    PRIVATE.DBHandler.getValue(CATEGORY.COMMERCIAL, [KEYS.POWER_ON_OFF_HISTORY],
                        function successCb(returnObject) {
                            var result = returnObject.powerOnOffHistory;
                            // 180524 iamjunyoung.park : Add type check routine for prevent error on emulator
                            // Reference : http://clm.lge.com/issue/browse/CHNSDK-10508
                            //   - Device   : string type
                            //   - Emulator : object type
                            if (typeof returnObject.powerOnOffHistory === 'string') {
                                result = JSON.parse(returnObject.powerOnOffHistory);
                            }
                            while (true) {
                                var emptyElementIndex = result.indexOf(' ')
                                if (emptyElementIndex === -1) {
                                    break;
                                }
                                else {
                                    result.splice(emptyElementIndex, 1);
                                }
                            }
                            PRIVATE.CallbackHandler.callSuccessCallback(successCallback, { powerOnOffHistory: result });
                        },
                        function failureCb(errorObject) {
                            PRIVATE.CallbackHandler.callFailureCallback(failureCallback, errorObject, Custom.ERROR_CODE.COMMON.INTERNAL_ERROR, 'Failed to get Power On/Off history.');
                        }
                    );
                });
            },
            /**
             * @version 1.0170223
             * @since webOS Signage 1.0
             * @function Custom#Configuration#setPowerOnStatus
             * @see Custom#Configuration#getPowerOnStatus
             * @see Custom#POWERONSTATUS
             * @description Sets Power On Status.
             * @example <caption>Sets Power On Status.</caption>
             * // Sets Power On Status.
             * var custom = new Custom();
             * custom.Configuration.setPowerOnStatus(
             *     function successCallback() {
             *         console.log('Power On Status is set.');
             *     },
             *     function failureCallback(failureObject) {
             *         console.error('[' + failureObject.errorCode + '] ' + failureObject.errorText);
             *     },
             *     {
             *         mode : Custom.POWERONSTATUS.POWERON
             *     }
             * );
             * @param {function} successCallback - Callback function if setPowerOnStatus() is called successfully without any argument object.
             * @param {function} failureCallback - Callback function when error is occurred during setPowerOnStatus() is called.
             *                                <br> If its callback is called, you can handle argument object with following properties:
             * @param {string} failureCallback.errorCode - Error code.
             * @param {string} failureCallback.errorText - Error text. 
             * @param {object} parameters 
             * @param {boolean} parameters.mode - Sets Power On Status value. See Custom#POWERONSTATUS for more detail.
             */
            setPowerOnStatus: function setPowerOnStatus(successCallback, failureCallback, parameters) {
                isThisAPISupported('getwebOSVersion', failureCallback, function () {

                    if (PRIVATE.ParameterChecker.checkMissingParameters(parameters, ['mode']) === false) {
                        PRIVATE.CallbackHandler.callFailureCallback(failureCallback, {}, Custom.ERROR_CODE.COMMON.BAD_PARAMETERS, 'Missing required parameters.');
                        return;
                    }

                    if (PRIVATE.ParameterChecker.checkParametersValidation(Custom.POWERONSTATUS, parameters, 'mode') === false) {
                        PRIVATE.CallbackHandler.callFailureCallback(failureCallback, {}, Custom.ERROR_CODE.COMMON.BAD_PARAMETERS, 'Invalid parameters.');
                        return;
                    }
                    PRIVATE.DBHandler.setValue(CATEGORY.HOTELMODE, { powerOnStatus: parameters.mode },
                        function (successObject) {
                            PRIVATE.CallbackHandler.callSuccessCallback(successCallback)
                        },
                        function (errorObject) {
                            PRIVATE.CallbackHandler.callFailureCallback(failureCallback, errorObject, Custom.ERROR_CODE.COMMON.INTERNAL_ERROR, 'Failed to set Power On status.');
                        }
                    );
                });
            },

            /**
             * @version 1.0170223
             * @since webOS Signage 1.0
             * @function Custom#Configuration#getPowerOnStatus
             * @see Custom#Configuration#setPowerOnStatus
             * @see Custom#POWERONSTATUS
             * @description Gets Power On Status.
             * @example <caption>Gets Power On Status.</caption>
             * // Gets Power On Status.
             * var custom = new Custom();
             * custom.Configuration.getPowerOnStatus(
             *     function successCallback(successObject) {
             *         console.log('Power On Status : ' + successObject.powerOnStatus);
             *     },
             *     function failureCallback(failureObject) {
             *         console.error('[' + failureObject.errorCode + '] ' + failureObject.errorText);
             *     },
             *     {
             *         mode : Custom.POWERONSTATUS.POWERON
             *     }
             * );
             * @param {function} successCallback - Callback function if getPowerOnStatus() is called successfully successfully.
             *                                <br> If its callback is called, you can handle argument object with following properties:
             * @param {string} successCallback.powerOnStatus - Current Power On Status value.
             * @param {function} failureCallback - Callback function when error is occurred during getPowerOnStatus() is called.
             *                                <br> If its callback is called, you can handle argument object with following properties:
             * @param {string} failureCallback.errorCode - Error code.
             * @param {string} failureCallback.errorText - Error text. 
             */
            getPowerOnStatus: function getPowerOnStatus(successCallback, failureCallback) {
                isThisAPISupported('getPowerOnStatus', failureCallback, function () {

                    PRIVATE.DBHandler.getValue(CATEGORY.HOTELMODE, [KEYS.POWER_ON_STATUS],
                        function successCb(returnObject) {
                            PRIVATE.CallbackHandler.callSuccessCallback(successCallback, { powerOnStatus: returnObject.powerOnStatus });
                        },
                        function failureCb(errorObject) {
                            PRIVATE.CallbackHandler.callFailureCallback(failureCallback, errorObject, Custom.ERROR_CODE.COMMON.INTERNAL_ERROR, 'Failed to get Power On status.');
                        }
                    );
                });
            },
            /**
             * @version 1.0
             * @since webOS Signage 2.0
             * @function Custom#Configuration#setKAM
             * @see Custom#Configuration#getKAM
             * @description Enable or disable Keep Alive Mode.
             * @example <caption>Below example will set KAM to true.</caption>
             * // Enable Keep alive mode.
             * var custom = new Custom();
             * custom.Configuration.setKAM(
             *     function successCallback() {
             *         console.log('KAM is enabled.');
             *     },
             *     function failureCallback(failureObject) {
             *         console.error('[' + failureObject.errorCode + '] ' + failureObject.errorText);
             *     },
             *     {
             *         keepAliveMode : true
             *     }
             * );
             * @param {function} successCallback - Callback function if setKAM() is called successfully without any argument object.
             * @param {function} failureCallback - Callback function when error is occurred during setKAM() is called.
             *                                <br> If its callback is called, you can handle argument object with following properties:
             * @param {string} failureCallback.errorCode - Error code.
             * @param {string} failureCallback.errorText - Error text. 
             * @param {object} parameters 
             * @param {boolean} parameters.keepAliveMode - If this value is true, KAM will be enabled. If false, KAM will be disabled.
             */
            setKAM: function setKAM(successCallback, failureCallback, parameters) {
                isThisAPISupported('setKAM', failureCallback, function () {

                    var KAM_value;
                    if (PRIVATE.ParameterChecker.checkMissingParameters(parameters, ['keepAliveMode']) === false) {
                        PRIVATE.CallbackHandler.callFailureCallback(failureCallback, {}, Custom.ERROR_CODE.COMMON.BAD_PARAMETERS, 'Missing required parameters.');
                        return;
                    }

                    if (parameters.keepAliveMode === true) {
                        KAM_value = 'enable';
                    }
                    else if (parameters.keepAliveMode === false) {
                        KAM_value = 'disable';
                    }
                    else {
                        PRIVATE.CallbackHandler.callFailureCallback(failureCallback, {}, Custom.ERROR_CODE.COMMON.BAD_PARAMETERS, 'Invalid parameter. parameters.enable should be true or false.');
                        return;
                    }
                    PRIVATE.DBHandler.setValue(CATEGORY.COMMERCIAL, { enableKAM: KAM_value },
                        function (successObject) {
                            PRIVATE.CallbackHandler.callSuccessCallback(successCallback)
                        },
                        function (errorObject) {
                            PRIVATE.CallbackHandler.callFailureCallback(failureCallback, errorObject, Custom.ERROR_CODE.COMMON.INTERNAL_ERROR, 'Failed to set Keep Alive Mode settings.');
                        });
                });
            },
            /**
             * @version 1.0
             * @since webOS Signage 2.0
             * @function Custom#Configuration#getKAM
             * @see Custom#Configuration#setKAM
             * @description Gets Keep Alive Mode is enabled or not.
             * @example <caption>Below example will get KAM is enabled or not.</caption>
             * // Gets Keep alive mode.
             * var custom = new Custom();
             * custom.Configuration.getKAM(
             *     function successCallback(successObject) {
             *         console.log('KAM is enabled? ' + successObject.keepAliveMode);
             *     },
             *     function failureCallback(failureObject) {
             *         console.error('[' + failureObject.errorCode + '] ' + failureObject.errorText);
             *     }
             * );
             * @param {function} successCallback - Callback function with object parameter if getKAM() is called successfully.
             *                                <br> If its callback is called, you can handle argument object with following properties:
             * @param {boolean} successCallback.keepAliveMode - Current KAM mode on or off.
             * @param {function} failureCallback - Callback function when error is occurred during getKAM() is called.
             *                                <br> If its callback is called, you can handle argument object with following properties:
             * @param {string} failureCallback.errorCode - Error code.
             * @param {string} failureCallback.errorText - Error text. 
             */
            getKAM: function getKAM(successCallback, failureCallback) {
                isThisAPISupported('getKAM', failureCallback, function () {

                    PRIVATE.DBHandler.getValue(CATEGORY.COMMERCIAL, [KEYS.KEEP_ALIVE_MODE],
                        function successCb(returnObject) {
                            var enabled = returnObject[KEYS.KEEP_ALIVE_MODE];
                            var result = (enabled === 'enable') ? true : false;
                            PRIVATE.CallbackHandler.callSuccessCallback(successCallback, { keepAliveMode: result });
                        },
                        function failureCb(errorObject) {
                            PRIVATE.CallbackHandler.callFailureCallback(failureCallback, errorObject, Custom.ERROR_CODE.COMMON.INTERNAL_ERROR, 'Failed to get Keep Alive Mode settings.');
                        }
                    );
                });
            },

            /**
             * @version 1.0
             * @since webOS Signage 1.0
             * @function Custom#Configuration#changePassword
             * @description Change Installation Menu password. Before changing password, you should put current password.
             *              If webOS Version is 3.2 or above, SI server menu password is not needed, so it will be not returned.
             * @example <caption>Below example will change new password to '1234', and you can get new SI server menu password.</caption>
             * // Changes installation password to new one, and gets new SI server menu password(if supported).
             * var custom = new Custom();
             * custom.Configuration.changePassword(
             *     function successCallback(successObject) {
             *         console.log('New password of SI Server settings is : ' + successObject.serverUIPassword);
             *     },
             *     function failureCallback(failureObject) {
             *         console.error('[' + failureObject.errorCode + '] ' + failureObject.errorText);
             *     },
             *     {
             *         currentPassword : '0000',
             *         newPassword     : '1234'
             *     }
             * );
             * @param {function} successCallback - Callback function if changePassword() is called successfully. 
             *                                <br> If its callback is called, you can handle argument object with following properties:
             * @param {string} successCallback.serverUIPassword New password of accessing SI Server Menu.
             *                                                  If webOS Version is 3.2 or above, SI server menu password is not needed, so it will be not returned.
             * @param {function} failureCallback - Callback function when error is occurred during changePassword() is called.
             *                                <br> If its callback is called, you can handle argument object with following properties:
             * @param {string} failureCallback.errorCode - Error code.
             * @param {string} failureCallback.errorText - Error text. 
             * @param {object} parameters
             * @param {string} parameters.currentPassword - Current password for entering Installation Menu. 
             * @param {string} parameters.newPassword - New password that you want to change.
             */
            changePassword: function changePassword(successCallback, failureCallback, parameters) {
                isThisAPISupported('changePassword', failureCallback, function () {

                    var currentPW, newPW,
                        PASSWORD_LENGTH = 4,
                        PASSWORD_MAX_VALUE = 9999;
                    if (PRIVATE.ParameterChecker.checkMissingParameters(parameters, ['currentPassword', 'newPassword']) === false) {
                        PRIVATE.CallbackHandler.callFailureCallback(failureCallback, {}, Custom.ERROR_CODE.COMMON.BAD_PARAMETERS, 'Missing required parameters.');
                        return;
                    }

                    currentPW = parameters.currentPassword,
                        newPW = parameters.newPassword;

                    if ((typeof currentPW !== 'string') || (typeof newPW !== 'string')) {
                        PRIVATE.CallbackHandler.callFailureCallback(failureCallback, {}, Custom.ERROR_CODE.COMMON.BAD_PARAMETERS, 'Invalid parameter type.');
                    }
                    // From webOS Signage 4, password length is 6
                    if (PLATFORM_INFO.webOSVersion >= 4.0) {
                        PASSWORD_LENGTH = 6;
                        PASSWORD_MAX_VALUE = 999999;
                    }

                    if ((currentPW.length !== PASSWORD_LENGTH) || (newPW.length !== PASSWORD_LENGTH) || (parseInt(newPW) < 0) || (parseInt(newPW) > PASSWORD_MAX_VALUE)) {
                        PRIVATE.CallbackHandler.callFailureCallback(failureCallback, {}, Custom.ERROR_CODE.COMMON.BAD_PARAMETERS, 'Invalid password format.');
                        return;
                    }

                    if (currentPW === newPW) {
                        PRIVATE.CallbackHandler.callFailureCallback(failureCallback, {}, Custom.ERROR_CODE.COMMON.BAD_PARAMETERS, 'Current and new password are same.');
                        return;
                    }

                    if (PLATFORM_INFO.webOSVersion >= 3.2) {
                        // 20180517 iamjunyoung.park : If webOS Signage is 3.2 or above, it used below luna
                        // luna-send -n 1 -f palm://com.webos.settingsservice/getSystemSettings '{"category":"lock", "keys":["systemPin"]}'
                        // luna-send -n 1 -f palm://com.webos.settingsservice/setSystemSettings '{"category":"lock", "settings":{"systemPin": "0000"}}'
                        PRIVATE.DBHandler.getValueBySettingsService(CATEGORY.LOCK, [KEYS.SYSTEMPIN],
                            function (successObject) {
                                if (successObject[KEYS.SYSTEMPIN] !== currentPW) {
                                    PRIVATE.CallbackHandler.callFailureCallback(failureCallback, {}, Custom.ERROR_CODE.COMMON.INTERNAL_ERROR, 'Incorrect password. Access denied.');
                                }
                                else {
                                    PRIVATE.DBHandler.setValueBySettingsService(CATEGORY.LOCK, { systemPin: newPW },
                                        function () {
                                            PRIVATE.CallbackHandler.callSuccessCallback(successCallback);
                                        }, function (err) {
                                            if (typeof failureCallback === "function") {
                                                PRIVATE.CallbackHandler.callFailureCallback(failureCallback, errorObject, Custom.ERROR_CODE.COMMON.INTERNAL_ERROR, "Failed to set new password.");
                                            }
                                        }
                                    );
                                }
                            },
                            function (errorObject) {
                                PRIVATE.CallbackHandler.callFailureCallback(failureCallback, errorObject, Custom.ERROR_CODE.COMMON.INTERNAL_ERROR, "Failed to get current password from platform.");
                            }
                        );
                    }
                    else {
                        // palm://com.webos.settingsservice/getSystemSettings '{"category":"hotelMode", "keys":["password"]}'
                        // palm://com.webos.settingsservice/setSystemSettings '{"category":"hotelMode ", "settings":{" password ": "0000"}}'

                        PRIVATE.DBHandler.getValue(CATEGORY.HOTELMODE, [KEYS.PASSWORD],
                            function (successObject) {
                                if (successObject[KEYS.PASSWORD] !== currentPW) {
                                    PRIVATE.CallbackHandler.callFailureCallback(failureCallback, {}, Custom.ERROR_CODE.COMMON.INTERNAL_ERROR, 'Incorrect password. Access denied.');
                                }
                                else {
                                    PRIVATE.DBHandler.setValue(CATEGORY.HOTELMODE, { password: newPW },
                                        function () {
                                            // 20180110 iamjunyoung.park : From webOS Signage 3.2, it doesn't need SI server menu password(8080), so delete it
                                            if (PLATFORM_INFO.webOSVersion >= 3.2) {
                                                PRIVATE.CallbackHandler.callSuccessCallback(successCallback);
                                            }
                                            // webOS Signage 1.0 ~ 3.0 : Return SI Server settings password
                                            else {
                                                var serverSIMenuPassword = '';
                                                if (newPW === '0000') {
                                                    serverSIMenuPassword = '8080';
                                                }
                                                else {
                                                    var newPWInt = parseInt(newPW);
                                                    serverSIMenuPassword = ('0000' + (parseInt((newPWInt / 10).toString())) + (((newPWInt + 1) % 10).toString())).substr(-4)
                                                }
                                                PRIVATE.CallbackHandler.callSuccessCallback(successCallback, { serverUIPassword: serverSIMenuPassword });
                                            }
                                        }, function (err) {
                                            if (typeof failureCallback === "function") {
                                                PRIVATE.CallbackHandler.callFailureCallback(failureCallback, errorObject, Custom.ERROR_CODE.COMMON.INTERNAL_ERROR, "Failed to set new password.");
                                            }
                                        }
                                    );
                                }
                            },
                            function (errorObject) {
                                PRIVATE.CallbackHandler.callFailureCallback(failureCallback, errorObject, Custom.ERROR_CODE.COMMON.INTERNAL_ERROR, "Failed to get current password from platform.");
                            }
                        );
                    }

                });
            },
            /**
             * @version 1.0
             * @since webOS Signage 3.0
             * @see Custom#NATIVEPORTRAIT
             * @see Custom#Configuration#setNativePortraitMode
             * @function Custom#Configuration#getNativePortraitMode
             * @description Gets native portrait rotation.
             * @example <caption>Below example will get native portrait mode settings.</caption>
             * // Gets native portrait mode settings.
             * var custom = new Custom();
             * custom.Configuration.getNativePortraitMode(
             *     function successCallback(successObject) {
             *         console.log('Native portrait settings : ' + successObject.nativePortrait);
             *     },
             *     function failureCallback(failureObject) {
             *         console.error('[' + failureObject.errorCode + '] ' + failureObject.errorText);
             *     }
             * );
             * @param {function} successCallback - Callback function if getNativePortraitMode() is called successfully. 
             *                                <br> If its callback is called, you can handle argument object with following properties:
             * @param {string} successCallback.nativePortrait - Current native portrait mode.
             * @param {function} failureCallback - Callback function when error is occurred during getNativePortraitMode() is called.
             *                                <br> If its callback is called, you can handle argument object with following properties:
             * @param {string} failureCallback.errorCode - Error code.
             * @param {string} failureCallback.errorText - Error text. 
             */
            getNativePortraitMode: function getNativePortraitMode(successCallback, failureCallback) {
                isThisAPISupported('getNativePortraitMode', failureCallback, function () {

                    // luna-send -n 1 -f palm://com.webos.settingsservice/getSystemSettings '{"category":"commercial", "keys":["siAppOrientation"]}'
                    if (PLATFORM_INFO.webOSVersion === 3) {
                        PRIVATE.DBHandler.getValue(CATEGORY.COMMERCIAL, [KEYS.NATIVE_PORTRAIT],
                            function (returnObject) {
                                PRIVATE.CallbackHandler.callSuccessCallback(successCallback, { nativePortrait: returnObject[KEYS.NATIVE_PORTRAIT] });
                            },
                            function (errorObject) {
                                PRIVATE.CallbackHandler.callFailureCallback(failureCallback, errorObject, Custom.ERROR_CODE.COMMON.INTERNAL_ERROR, "Failed to get Native Portrait Mode settings.");
                            }
                        );
                    }
                    // luna-send -n 1 -f palm://com.webos.settingsservice/getSystemSettings '{"category":"option", "keys":["screenRotation"]}'
                    else if (PLATFORM_INFO.webOSVersion >= 3.2) {
                        PRIVATE.DBHandler.getValue(CATEGORY.OPTION, [KEYS.SCREEN_ROTATION],
                            function (returnObject) {
                                PRIVATE.CallbackHandler.callSuccessCallback(successCallback, { nativePortrait: returnObject[KEYS.SCREEN_ROTATION] });
                            },
                            function (errorObject) {
                                PRIVATE.CallbackHandler.callFailureCallback(failureCallback, errorObject, Custom.ERROR_CODE.COMMON.INTERNAL_ERROR, "Failed to get Native Portrait Mode settings.");
                            }
                        );
                    }
                    else {
                        PRIVATE.CallbackHandler.callFailureCallback(failureCallback, {}, Custom.ERROR_CODE.COMMON.INTERNAL_ERROR, "Cannot get platform information yet. Try again later.");
                    }
                });
            },

            /**
             * @version 1.0
             * @since webOS Signage 3.0
             * @see Custom#NATIVEPORTRAIT
             * @see Custom#Configuration#getNativePortraitMode
             * @function Custom#Configuration#setNativePortraitMode
             * @description Sets native portrait rotation. See 'Custom.NATIVEPORTRAIT' constants for using this function.
             * @example <caption>Below example will set native portrait mode settings to 90 degrees.</caption>
             * // Sets native portrait mode settings.
             * var custom = new Custom();
             * custom.Configuration.setNativePortraitMode(
             *     function successCallback() {
             *         console.log('Native portrait is set');
             *     },
             *     function failureCallback(failureObject) {
             *         console.error('[' + failureObject.errorCode + '] ' + failureObject.errorText);
             *     },
             *     {
             *         nativePortrait : Custom.NATIVEPORTRAIT.DEGREE_90
             *     }
             * );
             * @param {function} successCallback - Callback function if setNativePortraitMode() is called successfully without any argument object.
             * @param {function} failureCallback - Callback function when error is occurred during setNativePortraitMode() is called.
             *                                <br> If its callback is called, you can handle argument object with following properties:
             * @param {string} failureCallback.errorCode - Error code.
             * @param {string} failureCallback.errorText - Error text. 
             * @param {Object} parameters
             * @param {string} parameters.nativePortrait - Degree that you want to rotate.
             */
            setNativePortraitMode: function setNativePortraitMode(successCallback, failureCallback, parameters) {
                isThisAPISupported('setNativePortraitMode', failureCallback, function () {

                    if (PRIVATE.ParameterChecker.checkMissingParameters(parameters, ['nativePortrait']) === false) {
                        PRIVATE.CallbackHandler.callFailureCallback(failureCallback, {}, Custom.ERROR_CODE.COMMON.BAD_PARAMETERS, 'Missing required parameters.');
                        return;
                    }

                    if (PRIVATE.ParameterChecker.checkParametersValidation(Custom.NATIVEPORTRAIT, parameters, 'nativePortrait') === false) {
                        PRIVATE.CallbackHandler.callFailureCallback(failureCallback, {}, Custom.ERROR_CODE.COMMON.BAD_PARAMETERS, 'Invalid parameters.');
                        return;
                    }
                    if (PLATFORM_INFO.webOSVersion === 3) {
                        // luna-send -n 1 -f palm://com.webos.settingsservice/setSystemSettings '{"category":"commercial", "settings":{"siAppOrientation" : "DEGREE"}}'
                        PRIVATE.DBHandler.setValue(CATEGORY.COMMERCIAL, { siAppOrientation: parameters.nativePortrait },
                            function (successObject) {
                                PRIVATE.CallbackHandler.callSuccessCallback(successCallback)
                            },
                            function (errorObject) {
                                PRIVATE.CallbackHandler.callFailureCallback(failureCallback, errorObject, Custom.ERROR_CODE.COMMON.INTERNAL_ERROR, "Failed to set Native Portrait Mode settings.");
                            }
                        );
                    }
                    // luna-send -n 1 -f palm://com.webos.settingsservice/setSystemSettings '{"category":"option", "settings":{"screenRotation" : "DEGREE"}}'
                    else if (PLATFORM_INFO.webOSVersion >= 3.2) {
                        PRIVATE.DBHandler.setValue(CATEGORY.OPTION, { screenRotation: parameters.nativePortrait },
                            function (successObject) {
                                PRIVATE.CallbackHandler.callSuccessCallback(successCallback)
                            },
                            function (errorObject) {
                                PRIVATE.CallbackHandler.callFailureCallback(failureCallback, errorObject, Custom.ERROR_CODE.COMMON.INTERNAL_ERROR, "Failed to set Native Portrait Mode settings.");
                            }
                        );
                    }
                    else {
                        PRIVATE.CallbackHandler.callFailureCallback(failureCallback, {}, Custom.ERROR_CODE.COMMON.INTERNAL_ERROR, "Cannot get platform information yet. Try again later.");
                    }
                });
            },

            /**
             * @version 1.0
             * @since webOS Signage 3.0
             * @see Custom#Configuration#setWoWLAN
             * @function Custom#Configuration#getWoWLAN
             * @description Gets WowLAN (Wake on Wireless LAN) settings.
             * @example <caption>Below example will get WowLAN (Wake on Wireless LAN) settings.</caption>
             * // Gets WoWLAN (Wake on Wireless LAN) settings.
             * var custom = new Custom();
             * custom.Configuration.getWoWLAN(
             *     function successCallback(successObject) {
             *         console.log('WoWLAN : ' + successObject.enableWoWLAN);
             *     },
             *     function failureCallback(failureObject) {
             *         console.error('[' + failureObject.errorCode + '] ' + failureObject.errorText);
             *     }
             * );
             * @param {function} successCallback - Callback function if getNativePortraitMode() is called successfully. 
             *                                <br> If its callback is called, you can handle argument object with following properties:
             * @param {boolean} successCallback.enableWoWLAN - If this value is true, WoWLAN is enabled. If not, WoWLAN is disabled.
             * @param {function} failureCallback - Callback function when error is occurred during getNativePortraitMode() is called.
             *                                <br> If its callback is called, you can handle argument object with following properties:
             * @param {string} failureCallback.errorCode - Error code.
             * @param {string} failureCallback.errorText - Error text. 
             */
            getWoWLAN: function getWoWLAN(successCallback, failureCallback) {
                isThisAPISupported('getWoWLAN', failureCallback, function () {

                    PRIVATE.DBHandler.getValue(CATEGORY.NETWORK, [KEYS.WOWLAN], function (returnObject) {
                        var returnValue;
                        if (returnObject[KEYS.WOWLAN] === 'true') {
                            returnValue = true;
                        }
                        else {
                            returnValue = false;
                        }
                        PRIVATE.CallbackHandler.callSuccessCallback(successCallback, { enableWoWLAN: returnValue });
                    }, function (errorObject) {
                        PRIVATE.CallbackHandler.callFailureCallback(failureCallback, errorObject, Custom.ERROR_CODE.COMMON.INTERNAL_ERROR, 'Failed to get WoWLAN settings.');
                    })
                });
            },

            /**
             * @version 1.0
             * @since webOS Signage 3.0
             * @see Custom#Configuration#getWoWLAN
             * @function Custom#Configuration#setWoWLAN
             * @description Sets WowLAN (Wake on Wireless LAN) settings.
             * @example <caption>Below example will set WowLAN (Wake on Wireless LAN) settings.</caption>
             * // Sets WoWLAN (Wake on Wireless LAN) settings.
             * var custom = new Custom();
             * custom.Configuration.setWoWLAN(
             *     function successCallback() {
             *         console.log('WoWLAN is set');
             *     },
             *     function failureCallback(failureObject) {
             *         console.error('[' + failureObject.errorCode + '] ' + failureObject.errorText);
             *     },
             *     {
             *         enableWoWLAN : true
             *     }
             * );
             * @param {function} successCallback - Callback function if getNativePortraitMode() is called successfully without any argument object.
             * @param {function} failureCallback - Callback function when error is occurred during getNativePortraitMode() is called.
             *                                <br> If its callback is called, you can handle argument object with following properties:
             * @param {string} failureCallback.errorCode - Error code.
             * @param {string} failureCallback.errorText - Error text. 
             * @param {object} parameters
             * @param {boolean} parameters.enableWoWLAN - If this value is true, WoWLAN will be enabled. if false, WoWLAN will be disabled.
             */
            setWoWLAN: function setWoWLAN(successCallback, failureCallback, parameters) {
                isThisAPISupported('setWoWLAN', failureCallback, function () {

                    if (PRIVATE.ParameterChecker.checkMissingParameters(parameters, ['enableWoWLAN']) === false) {
                        PRIVATE.CallbackHandler.callFailureCallback(failureCallback, {}, Custom.ERROR_CODE.COMMON.BAD_PARAMETERS, 'Missing required parameters.');
                        return;
                    }

                    if (typeof parameters.enableWoWLAN !== 'boolean') {
                        PRIVATE.CallbackHandler.callFailureCallback(failureCallback, {}, Custom.ERROR_CODE.COMMON.BAD_PARAMETERS, 'enableWoWLAN property value must be true or false boolean value.');
                        return;
                    }

                    PRIVATE.DBHandler.setValue(CATEGORY.NETWORK, { wolwowlOnOff: parameters.enableWoWLAN.toString() },
                        function () {
                            PRIVATE.CallbackHandler.callSuccessCallback(successCallback);
                        },
                        function (errorObject) {
                            PRIVATE.CallbackHandler.callFailureCallback(failureCallback, errorObject, Custom.ERROR_CODE.COMMON.INTERNAL_ERROR, 'Failed to set WoWLAN settings.');
                        }
                    )
                });
            }
        }

        /**
         * @version 1.0
         * @namespace Custom#Signage
         * @description Dependence APIs about signage.
         */
        Custom.prototype.Signage = {


            /**
             * @version 1.3180710
             * @since webOS Signage 1.0
             * @function Custom#Signage#addUSBAttachEventListener
             * @description Add event listener that get USB/SDCard list whenever external storage device is attached/detached.
             * @example <caption>Below example will get external storage list.
             * // Add event listener.
             * var custom = new Custom();
             * custom.Signage.addUSBAttachEventListener(
             *     // successCallback is called whenever external storage device is attached/detached.
             *     function successCallback(successObject) {
             *         for(var i=0; i<successObject.deviceList.length; i++) {
             *             var device = successObject.deviceList[i];
             *             console.log('Device Type   : ' + device.type);
             *             console.log('Device Vendor : ' + device.vendor);
             *             console.log('Device Name   : ' + device.device);
             *         }
             *     },
             *     function failureCallback(failureObject) {
             *         console.error('[' + failureObject.errorCode + '] ' + failureObject.errorText);
             *     }
             * );
             * @param {function} successCallback - Callback function if addUSBAttachEventListener() is called successfully.
             *                                <br> If its callback is called, you can handle argument object with following properties:
             * @param {object} successCallback.deviceList - Connected USB storage device list.
             * @param {function} failureCallback - Callback function when error is occurred during addUSBAttachEventListener() is called.
             *                                <br> If its callback is called, you can handle argument object with following properties:
             * @param {string} failureCallback.errorCode - Error code.
             * @param {string} failureCallback.errorText - Error text. 
             */
            // luna-send -n -P -f luna://com.webos.service.attachedstoragemanager/listDevices '{"subscribe":true}'
            addUSBAttachEventListener: function addUSBAttachEventListener(successCallback, failureCallback) {
                isThisAPISupported('addUSBAttachEventListener', failureCallback, function () {
                    SUBSCRIBED.USBAttachEventListener =
                        webOS.Request('luna://com.webos.service.attachedstoragemanager', {
                            method: 'listDevices',
                            parameters: { subscribe: true },
                            onSuccess: function (returnObject) {
                                var _deviceList = [];
                                if (returnObject.devices) {
                                    for (var i = 0; i < returnObject.devices.length; i++) {
                                        var device = returnObject.devices[i];
                                        if (device.deviceType === 'usb' || device.deviceType === 'sdcard') {
                                            _deviceList.push({
                                                type: device.deviceType,
                                                vendor: device.vendorName,
                                                device: device.deviceName,
                                            });
                                        }
                                    }
                                }
                                PRIVATE.CallbackHandler.callSuccessCallback(successCallback, { deviceList: _deviceList });
                            },
                            onFailure: function () {
                                PRIVATE.CallbackHandler.callFailureCallback(failureCallback, {}, Custom.ERROR_CODE.COMMON.INTERNAL_ERROR, 'Cannot get USB device information.');
                            }
                        });
                });
            },


            /**
             * @version 1.3180710
             * @since webOS Signage 1.0
             * @function Custom#Signage#removeUSBAttachEventListener
             * @description Remove registered event listener that get USB/SDCard list whenever external storage device is attached/detached.
             * @example <caption>Below example will remove USB attach event listener as already registered.
             * // Remove event listener.
             * var custom = new Custom();
             * custom.Signage.removeUSBAttachEventListener(
             *     function successCallback(successObject) {
             *         console.log('USB attach remove listener is removed.');
             *     },
             *     function failureCallback(failureObject) {
             *         console.error('[' + failureObject.errorCode + '] ' + failureObject.errorText);
             *     }
             * );
             * @param {function} successCallback - Callback function if switchApplication() is called successfully without any argument object.
             * @param {function} failureCallback - Callback function when error is occurred during removeUSBAttachEventListener() is called.
             *                                <br> If its callback is called, you can handle argument object with following properties:
             * @param {string} failureCallback.errorCode - Error code.
             * @param {string} failureCallback.errorText - Error text. 
             */
            // luna-send -n -P -f luna://com.webos.service.attachedstoragemanager/listDevices '{"subscribe":true}'
            removeUSBAttachEventListener: function removeUSBAttachEventListener(successCallback, failureCallback) {
                isThisAPISupported('removeUSBAttachEventListener', failureCallback, function () {
                    if (SUBSCRIBED.USBAttachEventListener === null) {
                        PRIVATE.CallbackHandler.callFailureCallback(failureCallback, {}, Custom.ERROR_CODE.COMMON.INTERNAL_ERROR, 'Event listener is not set. Use addUSBAttachEventListener() first.');
                    }
                    else {
                        SUBSCRIBED.USBAttachEventListener.cancel();
                        PRIVATE.CallbackHandler.callSuccessCallback(successCallback);
                    }
                });
            },

            /**
             * @version 1.0170328
             * @since webOS Signage 1.0
             * @function Custom#Signage#getwebOSVersion
             * @description Gets webOS Signage version.
             * @example <caption>Below example will get webOS Signage version.
             * // Gets webOS Signage version.
             * var custom = new Custom();
             * custom.Signage.getwebOSVersion(
             *     function successCallback(successObject) {
             *         console.log('webOS Signage version : ' + successObject.webOSVersion);
             *     },
             *     function failureCallback(failureObject) {
             *         console.error('[' + failureObject.errorCode + '] ' + failureObject.errorText);
             *     }
             * );
             * @param {function} successCallback - Callback function if getwebOSVersion() is called successfully.
             *                                <br> If its callback is called, you can handle argument object with following properties:
             * @param {string} successCallback.webOSVersion - webOS Signage version.
             * @param {function} failureCallback - Callback function when error is occurred during getwebOSVersion() is called.
             *                                <br> If its callback is called, you can handle argument object with following properties:
             * @param {string} failureCallback.errorCode - Error code.
             * @param {string} failureCallback.errorText - Error text. 
             */
            getwebOSVersion: function getwebOSVersion(successCallback, failureCallback) {
                isThisAPISupported('getwebOSVersion', failureCallback, function () {
                    if (PLATFORM_INFO.webOSVersion === -2) {
                        PRIVATE.CallbackHandler.callFailureCallback(failureCallback, {}, Custom.ERROR_CODE.COMMON.INTERNAL_ERROR, 'Cannot get platform information yet. Please try later.');
                    }
                    else if (PLATFORM_INFO.webOSVersion === -1) {
                        PRIVATE.CallbackHandler.callFailureCallback(failureCallback, {}, Custom.ERROR_CODE.COMMON.INTERNAL_ERROR, 'Cannot get platform information.');
                    }
                    else if (typeof PLATFORM_INFO.webOSVersion === 'number') {
                        PRIVATE.CallbackHandler.callSuccessCallback(successCallback, { webOSVersion: PLATFORM_INFO.webOSVersion.toFixed(1) });
                    }
                    else {
                        PRIVATE.CallbackHandler.callFailureCallback(failureCallback, {}, Custom.ERROR_CODE.COMMON.INTERNAL_ERROR, 'Cannot get platform information.');
                    }
                });
            },

            /**
             * @version 1.0170120
             * @since webOS Signage 2.0
             * @function Custom#Signage#getApplicationInfo
             * @description Gets IPK type application information from appinfo.json.
             *              If current application type is not IPK type, failureCallback will be called.
             *              This function call successfully only if current location is application root.
             * @example <caption>Below example will get IPK application information from appinfo.json.</caption>
             * // Gets IPK type application information from appinfo.json.
             * var custom = new Custom();
             * custom.Signage.getApplicationInfo(
             *     function successCallback(successObject) {
             *         console.log('Data from appinfo.json : ' + JSON.stringify(successObject), null, 4);
             *     },
             *     function failureCallback(failureObject) {
             *         console.error('[' + failureObject.errorCode + '] ' + failureObject.errorText);
             *     }
             * );
             * @param {function} successCallback - Callback function if getApplicationInfo() is called successfully with a argument object from appinfo.json.
             * @param {function} failureCallback - Callback function when error is occurred during getApplicationInfo() is called.
             *                                <br> If its callback is called, you can handle argument object with following properties:
             * @param {string} failureCallback.errorCode - Error code.
             * @param {string} failureCallback.errorText - Error text. 
             */
            getApplicationInfo: function getApplicationInfo(successCallback, failureCallback) {
                isThisAPISupported('getApplicationInfo', failureCallback, function () {

                    if (getApplicationID() !== Custom.APPLICATION.IPK_TYPE) {
                        PRIVATE.CallbackHandler.callFailureCallback(failureCallback, {}, Custom.ERROR_CODE.COMMON.INTERNAL_ERROR, 'This application is not IPK type.');
                        return;
                    }

                    var xhttp = new XMLHttpRequest();
                    xhttp.onreadystatechange = function () {
                        if (this.readyState == 4) {
                            try {
                                var retObject = JSON.parse(this.responseText);
                                PRIVATE.CallbackHandler.callSuccessCallback(successCallback, retObject);
                            }
                            catch (e) {
                                PRIVATE.CallbackHandler.callFailureCallback(failureCallback, {}, Custom.ERROR_CODE.COMMON.INTERNAL_ERROR, 'Failed to get application information.');
                            }
                        }
                    };

                    xhttp.onerror = function (err) {
                        PRIVATE.CallbackHandler.callFailureCallback(failureCallback, {}, Custom.ERROR_CODE.COMMON.INTERNAL_ERROR, 'Failed to get application information.');
                    }

                    xhttp.open("GET", "appinfo.json", true);
                    xhttp.send();
                });
            },

            /**
             * @version 1.0
             * @since webOS Signage 2.0
             * @see Custom#APPLICATION
             * @function Custom#Signage#switchApplication
             * @description Switch current app to target application. You should installed target application, such as ZIP type or IPK type.
             *              See 'Custom.APPLICATION' constants for using this function.
             * @example <caption>Below example will switch application to IPK application.</caption>
             * // Switch current app to target application.
             * var custom = new Custom();
             * custom.Signage.switchApplication(
             *     function successCallback() {
             *         console.log('This success callback does not work because new application will be launched.');
             *     },
             *     function failureCallback(failureObject) {
             *         console.error('[' + failureObject.errorCode + '] ' + failureObject.errorText);
             *     },
             *     {
             *         application : Custom.APPLICATION.IPK_TYPE
             *     }
             * );
             * @param {function} successCallback - Callback function if switchApplication() is called successfully without any argument object.
             * @param {function} failureCallback - Callback function when error is occurred during switchApplication() is called.
             *                                <br> If its callback is called, you can handle argument object with following properties:
             * @param {string} failureCallback.errorCode - Error code.
             * @param {string} failureCallback.errorText - Error text. 
             * @param {object} parameters 
             * @param {string} parameters.application - Target application for you want to switch and launch 
             */
            switchApplication: function switchApplication(successCallback, failureCallback, parameters) {
                isThisAPISupported('switchApplication', failureCallback, function () {

                    if (PRIVATE.ParameterChecker.checkMissingParameters(parameters, ['application']) === false) {
                        PRIVATE.CallbackHandler.callFailureCallback(failureCallback, {}, Custom.ERROR_CODE.COMMON.BAD_PARAMETERS, 'Missing required parameters.');
                        return;
                    }

                    if ((typeof parameters.application !== 'string') || (PRIVATE.ParameterChecker.checkParametersValidation(Custom.APPLICATION, parameters, 'application') === false)) {
                        PRIVATE.CallbackHandler.callFailureCallback(failureCallback, {}, Custom.ERROR_CODE.COMMON.BAD_PARAMETERS, 'Invalid application.');
                        return;
                    }

                    getZIPTypeLaunchURI(
                        function successGetURI(zipURI) {
                            getDebugMode(
                                function (isDebug) {
                                    if (isDebug === true) {
                                        Custom.APPLICATION.ZIP_TYPE += '.debug';
                                    }
                                    webOS.Request('luna://com.webos.applicationManager', {
                                        method: 'launch',
                                        parameters: {
                                            id: parameters.application,
                                            params: {
                                                path: zipURI
                                            }
                                        },
                                        onSuccess: function () {
                                            // It is not called because application is switched and go to background
                                            PRIVATE.CallbackHandler.callSuccessCallback(successCallback);
                                        },
                                        onFailure: function (errorObject) {
                                            if (errorObject.errorCode === -101) {
                                                PRIVATE.CallbackHandler.callFailureCallback(failureCallback, {}, Custom.ERROR_CODE.APPLICATION.NOT_INSTALLED, 'Application is not installed.');
                                            }
                                            else {
                                                PRIVATE.CallbackHandler.callFailureCallback(failureCallback, errorObject, Custom.ERROR_CODE.COMMON.INTERNAL_ERROR, 'Failed to launch target application.');
                                            }

                                        }
                                    })
                                },
                                function (errorObject) {
                                    PRIVATE.CallbackHandler.callFailureCallback(failureCallback, errorObject, Custom.ERROR_CODE.COMMON.INTERNAL_ERROR, 'Failed to get application information.');
                                }
                            ); // getDebugMode
                        },
                        function failureGetURI(errorObject) {
                            PRIVATE.CallbackHandler.callFailureCallback(failureCallback, errorObject, Custom.ERROR_CODE.COMMON.INTERNAL_ERROR, 'Failed to get application launch settings.');
                            return;
                        }
                    ); // getZIPTypeLaunchURI
                });
            },

            /**
             * @version 1.0161215
             * @since webOS Signage 1.0
             * @function Custom#Signage#disableApplication
             * @description Disable SI application after rebooting. It will set application launch mode to NONE.
             *              If 'reset' property set to true, all SI server settings will be reset.
             * @example <caption>Below example will disable application after rebooting.</caption>
             * // Disable SI application, and reset all SI Server settings.
             * var custom = new Custom();
             * custom.Signage.disableApplication(
             *     function successCallback() {
             *         console.log('After rebooting, application is not launched.');
             *     },
             *     function failureCallback(failureObject) {
             *         console.error('[' + failureObject.errorCode + '] ' + failureObject.errorText);
             *     },
             *     {
             *         reset : true
             *     }
             * );
             * @param {function} successCallback - Callback function if disableApplication() is called successfully without any argument object.
             * @param {function} failureCallback - Callback function when error is occurred during disableApplication() is called.
             *                                <br> If its callback is called, you can handle argument object with following properties:
             * @param {string} failureCallback.errorCode - Error code.
             * @param {string} failureCallback.errorText - Error text. 
             * @param {object} parameters
             * @param {string} [parameters.reset = false] - If its value is true, all SI Server settings value will be reset. Default value is false.
             */
            disableApplication: function disableApplication(successCallback, failureCallback, parameters) {
                isThisAPISupported('disableApplication', failureCallback, function () {

                    var settings = { appLaunchMode: "none" };

                    if (PRIVATE.ParameterChecker.checkMissingParameters(parameters, ['reset']) === true) {
                        if (typeof parameters.reset !== 'boolean') {
                            PRIVATE.CallbackHandler.callFailureCallback(failureCallback, {}, Custom.ERROR_CODE.COMMON.BAD_PARAMETERS, 'reset property value must be true or false boolean value, if use this property.');
                            return;
                        }
                        else if (parameters.reset === true) {
                            settings.siServerIp = '0.0.0.0';
                            settings.serverIpPort = '0';
                            settings.secureConnection = 'off';
                            settings.appType = 'zip';
                            settings.fqdnMode = 'off';
                            settings.fqdnAddr = 'http://';
                        }
                    }
                    else {
                        PRIVATE.CallbackHandler.callFailureCallback(failureCallback, {}, Custom.ERROR_CODE.COMMON.BAD_PARAMETERS, 'Application will be disabled after reboot only if reset property is true.');
                    }
                    PRIVATE.DBHandler.setValue(CATEGORY.COMMERCIAL, settings,
                        function () {
                            PRIVATE.CallbackHandler.callSuccessCallback(successCallback);
                        },
                        function (errorObject) {
                            PRIVATE.CallbackHandler.callFailureCallback(failureCallback, errorObject, Custom.ERROR_CODE.COMMON.INTERNAL_ERROR, 'Failed to disable application.');
                        }
                    )
                });
            }
        }

        /**
         * @version 1.0
         * @namespace Custom#VideoSync
         * @description Video synchronization APIs
         */
        Custom.prototype.VideoSync = {
            /**
             * @version 1.002
             * @since webOS Signage 2.0
             * @see Custom#VideoSync#setMaster
             * @function Custom#VideoSync#setMaster
             * @description Sets master device. Master device will manage itself and all slave synchronization.
             * @example <caption>Below example will set master device settings. </caption>
             * // Sets master device settings.
             * var custom = new Custom();
             * custom.VideoSync.setMaster(
             *     function successCallback(successObject) {
             *         console.log('Basetime is : ' + successObject.basetime);
             *     },
             *     function failureCallback(failureObject) {
             *         console.error('[' + failureObject.errorCode + '] ' + failureObject.errorText);
             *     },
             *     {
             *         ip : '192.168.0.2',
             *         port : 12345
             *     }
             * );
             * @param {function} successCallback - Callback function if setMaster() is called successfully. 
             *                                <br> If its callback is called, you can handle argument object with following properties:
             * @param {string} successCallback.basetime - Base time.
             * @param {function} failureCallback - Callback function when error is occurred during setMaster() is called.
             *                                <br> If its callback is called, you can handle argument object with following properties:
             * @param {string} failureCallback.errorCode - Error code.
             * @param {string} failureCallback.errorText - Error text. 
             * @param {object} parameters
             * @param {string} parameters.ip - Define master's IP address for synchronize contents.
             * @param {number} parameters.port - Define master's port for synchronize contents.
             * @param {object} [parameters.videoElement] - Set video element for syncing.
             */
            setMaster: function setMaster(successCallback, failureCallback, parameters) {
                isThisAPISupported('setMaster', failureCallback, function () {

                    // Check required parameters is exists
                    if (PRIVATE.ParameterChecker.checkMissingParameters(parameters, ['ip', 'port']) === false) {
                        PRIVATE.CallbackHandler.callFailureCallback(failureCallback, {}, Custom.ERROR_CODE.COMMON.BAD_PARAMETERS, 'Missing required parameters.');
                        return;
                    }

                    // Check parameters type
                    if ((typeof parameters !== 'object') || (typeof parameters.ip !== 'string') || (typeof parameters.port !== 'number') || isNaN(parameters.port)) {
                        PRIVATE.CallbackHandler.callFailureCallback(failureCallback, {}, Custom.ERROR_CODE.COMMON.BAD_PARAMETERS, 'Invalid parameters.');
                        return;
                    }

                    // IP format must be AAA.BBB.CCC.DDD
                    var checkIPArray = parameters.ip.split('.');
                    if (checkIPArray.length !== 4) {
                        PRIVATE.CallbackHandler.callFailureCallback(failureCallback, {}, Custom.ERROR_CODE.COMMON.BAD_PARAMETERS, 'Invalid IP format.');
                        return;
                    }

                    // Check IP format
                    for (var i = 0; i < 4; i++) {
                        var ipClass = parseInt(checkIPArray[i]);
                        if ((ipClass < 0) || (ipClass > 255)) {
                            PRIVATE.CallbackHandler.callFailureCallback(failureCallback, {}, Custom.ERROR_CODE.COMMON.BAD_PARAMETERS, 'Invalid IP format.');
                            return;
                        }
                    }

                    // Port value must be from 0 to 65535
                    if (parameters.port < 0 || parameters.port > 65535) {
                        PRIVATE.CallbackHandler.callFailureCallback(failureCallback, {}, Custom.ERROR_CODE.COMMON.BAD_PARAMETERS, 'Invalid port value.');
                        return;
                    }

                    // 
                    getMediaID(
                        function successCb_getMediaID(id) {
                            webOS.Request('luna://com.webos.media', {
                                method: 'setMaster',
                                parameters: {
                                    mediaId: id,
                                    ip: parameters.ip,
                                    port: parameters.port
                                },
                                onSuccess: function (successObject) {
                                    PRIVATE.CallbackHandler.callSuccessCallback(successCallback, { basetime: successObject.basetime });
                                },
                                onFailure: function (errorObject) {
                                    PRIVATE.CallbackHandler.callFailureCallback(failureCallback, errorObject, Custom.ERROR_CODE.COMMON.INTERNAL_ERROR, 'Failed to set master.')
                                }
                            })
                        },
                        function failure_getMediaID(errorObject) {
                            PRIVATE.CallbackHandler.callFailureCallback(failureCallback, errorObject, Custom.ERROR_CODE.COMMON.MEDIA_ERROR, 'Failed to get loaded media information.')
                        },
                        {
                            videoEl: parameters.videoElement
                        }
                    );

                    // 
                });
            },
            /**
            * @version 1.002
            * @since webOS Signage 2.0
            * @see Custom#VideoSync#setSlave
            * @function Custom#VideoSync#setSlave
            * @description Sets slave device and connect to master device. Master device will manage itself and all slave synchronization.
            * @example <caption>Below example will set itself is slave and set master device settings. </caption>
            * // Sets slave device.
            * var custom = new Custom();
            * custom.VideoSync.setSlave(
            *     function successCallback() {
            *         console.log('setSlave is successfully run.');
            *     },
            *     function failureCallback(failureObject) {
            *         console.error('[' + failureObject.errorCode + '] ' + failureObject.errorText);
            *     },
            *     {
            *         ip : '192.168.0.2',
            *         port : 12345,
            *         basetime: '1234567890' // Value from Master device
            *     }
            * );
            * @param {function} successCallback - Callback function if setSlave() is called successfully without any argument object.
            * @param {function} failureCallback - Callback function when error is occurred during setSlave() is called.
            *                                <br> If its callback is called, you can handle argument object with following properties:
            * @param {string} failureCallback.errorCode - Error code.
            * @param {string} failureCallback.errorText - Error text. 
            * @param {object} parameters
            * @param {string} parameters.ip - Define master's IP address for synchronize contents.
            * @param {number} parameters.port - Define master's port for synchronize contents.
            * @param {string} parameters.basetime - Basetime from master.
            * @param {object} [parameters.videoElement] - Set video element for syncing.
            */
            setSlave: function setSlave(successCallback, failureCallback, parameters) {
                isThisAPISupported('setSlave', failureCallback, function () {

                    if (PRIVATE.ParameterChecker.checkMissingParameters(parameters, ['ip', 'port', 'basetime']) === false) {
                        PRIVATE.CallbackHandler.callFailureCallback(failureCallback, {}, Custom.ERROR_CODE.COMMON.BAD_PARAMETERS, 'Missing required parameters.');
                        return;
                    }

                    if ((typeof parameters !== 'object') || (typeof parameters.ip !== 'string') || (typeof parameters.port !== 'number') || isNaN(parameters.port)) {
                        PRIVATE.CallbackHandler.callFailureCallback(failureCallback, {}, Custom.ERROR_CODE.COMMON.BAD_PARAMETERS, 'Invalid parameters.');
                        return;
                    }

                    // IP format must be AAA.BBB.CCC.DDD
                    var checkIPArray = parameters.ip.split('.');
                    if (checkIPArray.length !== 4) {
                        PRIVATE.CallbackHandler.callFailureCallback(failureCallback, {}, Custom.ERROR_CODE.COMMON.BAD_PARAMETERS, 'Invalid IP format.');
                        return;
                    }

                    for (var i = 0; i < 4; i++) {
                        var ipClass = parseInt(checkIPArray[i]);
                        if ((ipClass < 0) || (ipClass > 255)) {
                            PRIVATE.CallbackHandler.callFailureCallback(failureCallback, {}, Custom.ERROR_CODE.COMMON.BAD_PARAMETERS, 'Invalid IP format.');
                            return;
                        }
                    }

                    // Port value must be from 0 to 65535
                    if (parameters.port < 0 || parameters.port > 65535) {
                        PRIVATE.CallbackHandler.callFailureCallback(failureCallback, {}, Custom.ERROR_CODE.COMMON.BAD_PARAMETERS, 'Invalid port value.');
                        return;
                    }

                    // Port value must be from 0 to 65535
                    if (parseInt(parameters.basetime < 0)) {
                        PRIVATE.CallbackHandler.callFailureCallback(failureCallback, {}, Custom.ERROR_CODE.COMMON.BAD_PARAMETERS, 'Invalid basetime value.');
                        return;
                    }

                    getMediaID(
                        function successCb_getMediaID(id) {
                            webOS.Request('luna://com.webos.media', {
                                method: 'setSlave',
                                parameters: {
                                    mediaId: id,
                                    ip: parameters.ip,
                                    port: parameters.port,
                                    basetime: parameters.basetime
                                },
                                onSuccess: function () {
                                    PRIVATE.CallbackHandler.callSuccessCallback(successCallback);
                                },
                                onFailure: function (errorObject) {
                                    PRIVATE.CallbackHandler.callFailureCallback(failureCallback, errorObject, Custom.ERROR_CODE.COMMON.INTERNAL_ERROR, 'Failed to set slave.');
                                }
                            });
                        },
                        function failure_getMediaID(errorObject) {
                            PRIVATE.CallbackHandler.callFailureCallback(failureCallback, errorObject, Custom.ERROR_CODE.COMMON.MEDIA_ERROR, 'Failed to get loaded media information.');
                        },
                        {
                            videoEl: parameters.videoElement
                        }
                    )
                });
            }
        }

        module.exports = Custom;
    });
    Custom = cordova.require("cordova/plugin/custom");
})();