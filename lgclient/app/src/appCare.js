import React from "react";

export default class AppCare extends React.Component {
  componentDidMount() {
    init();
  }

  start() {
    start();
  }
  stop() {
    pause();
  }

  render() {
    return (
      <div>
        <button onClick={this.start.bind(this)}>start</button>
        <button onClick={this.stop.bind(this)}>stop</button>
      </div>
    );
  }
}

// Gets webOS Signage version
function getwebOSVersion() {
  var custom = new window.Custom();
  custom.Signage.getwebOSVersion(
    function successCallback(successObject) {
      var webOSVersion = successObject.webOSVersion;
      console.log("webOS Signage version: " + webOSVersion);
      switch (webOSVersion) {
        case "1.0":
        case "2.0":
        case "3.0":
        case "3.2":
          window.webOS.service.request("luna://com.lg.app.signage.service", {
            method: "confi",
            parameters: {
              wversion: "3.2"
            },
            onSuccess: function(ret) {
              console.log("confi on success : " + Date());
              console.log(ret);
            },
            onFailure: callback
          });
          break;
        case "4.0":
          window.webOS.service.request("luna://com.lg.app.signage.service", {
            method: "confi",
            parameters: {
              wversion: "4.0"
            },
            onSuccess: function(ret) {
              console.log("confi on success : " + Date());
              console.log(ret);
            },
            onFailure: callback
          });
          break;
        default:
          console.log("Unknown webOS Version!!");
      }
    },
    function failureCallback(failureObject) {
      console.log(
        "[" + failureObject.errorCode + "]" + failureObject.errorText
      );
    }
  );
}

function pause() {
  setTimeout(function() {
    console.log("disable servie");
    window.webOS.service.request("luna://com.lg.app.signage.service", {
      method: "stop",
      onSuccess: callback,
      onFailure: callback
    });
  }, 30000);
}

function init() {
  console.log("version : " + window.webOS.libVersion);
  getwebOSVersion();
}

function start() {
  var request = window.webOS.service.request(
    "luna://com.lg.app.signage.service",
    {
      method: "start",
      onSuccess: function(ret) {
        console.log("watchDog on success : " + Date());
        console.log(ret);
        //pause();
      },
      onFailure: callback,
      subscribe: true
    }
  );
}

function callback(cbObject) {
  console.log("on fail/success : " + Date());
  console.log(cbObject);
}
