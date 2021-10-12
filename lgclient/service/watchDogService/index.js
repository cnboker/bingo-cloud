var Service = require("webos-service");
var service = new Service("com.lg.app.signage.watchdog");

var fs = require("fs");

var VALID_SOC_APP_IDS = [
  "commercial.signage.signageapplauncher",
  "commercial.signage.signageapplauncher.debug",
  "com.lg.app.signage",
  "com.webos.app.softwareupdate"
];

var Debug = {
  enabled: true,
  path: "/media/internal/log.txt",
  log: function(cls, str) {
    if (Debug.enabled) {
      fs.appendFileSync(
        Debug.path,
        " [ LOG ] [" +
          getNow() +
          "] [" +
          ("                        " + cls).substr(-24) +
          "] " +
          str +
          "\n"
      );
    }
  },
  error: function(cls, str) {
    if (Debug.enabled) {
      fs.appendFileSync(
        Debug.path,
        " [ERROR] [" +
          getNow() +
          "] [" +
          ("                        " + cls).substr(-24) +
          "] " +
          str +
          "\n"
      );
    }
  }
};



service.register("writeFile", function(message) {
  var text = message.payload.text;
  fs.writeFileSync("/media/internal/log.txt", text, "utf8");
  message.response({
    returnValue: true,
    reply: "write complete"
  });
});

service.register("appendFile", function(message) {
  var text = message.payload.text;
  fs.appendFileSync("/media/internal/log.txt", text, "utf8");
  message.response({
    returnValue: true,
    reply: "append complete"
  });
});

service.register("readFile", function(message) {
  var location = message.payload.location;
  var readData = fs.readFileSync(location, "utf8");
  message.response({
    returnValue: true,
    reply: "read complete",
    data: readData
  });
});

var webOSVersion = "";
var Configuration;
var configuration;

service.register("confi", function(message) {
  webOSVersion = message.payload.wversion;
  Debug.log("require webOSVersion ==", webOSVersion);
  switch (webOSVersion) {
    case "1.0":
    case "2.0":
    case "3.0":
      console.log("Not available!!");
      Debug.log("require", "Not available!!");
      break;
    case "3.2":
      Debug.log("confi", "require 3.2");
      Configuration = require("../scap/1.5/configuration_soj.js");
      configuration = new Configuration(service);
      break;
    case "4.0":
      Debug.log("confi", "require 4.0");
      Configuration = require("../scap/1.6/configuration_soj.js");
      configuration = new Configuration(service);
      break;
    default:
      Debug.log("confi", "Unknown webOS Version");
      console.log("Unknown webOS Version!!");
  }
  message.respond({
    returnValue: true,
    status: "require started" + webOSVersion
  });
});

function getNow() {
  return new Date()
    .toISOString()
    .replace("T", " ")
    .substr(0, 19);
}

var requestInterval = null;

service.register("start", function(message) {
  if (requestInterval == null) {
    startMonitoring(message);
    message.respond({
      //. If the returnValue property is set to true, the onSuccess callback method defined in the caller app is called. Likewise,
      // the onFailure callback method is called if the value is false
      returnValue: true,
      status: "monitoring started"
    });
  } else {
    message.respond({
      returnValue: true,
      status: "monitoring already running"
    });
  }
});

service.register("stop", function(message) {
  if (requestInterval) {
    clearInterval(requestInterval);
    requestInterval = null;
    message.respond({
      returnValue: true,
      status: "Monitoring paused"
    });
  } else {
    message.respond({
      returnValue: true,
      status: "Monitoring not running or already paused"
    });
  }
});

function startMonitoring(message) {
  requestInterval = setInterval(function() {
    service.call(
      "luna://com.webos.service.acb/getForegroundAppInfo",
      {},
      function(msg) {
        message.respond({
          returnValue: true,
          payload: msg.payload
        });

        if (msg.payload.returnValue === true) {
          if (VALID_SOC_APP_IDS.indexOf(msg.payload.appId) > -1) {
            return;
          }

          function successCb() {
            message.respond({
              returnValue: true,
              description: "Application restart successful"
            });
          }

          function failureCb(error) {
            message.respond({
              returnValue: true,
              errorText: error.errorText,
              errorCode: error.errorCode
            });
          }
          configuration.restartApplication(successCb, failureCb);
        }
      }
    );
  }, 5000);
}
