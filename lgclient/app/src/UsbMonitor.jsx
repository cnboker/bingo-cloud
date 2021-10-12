import React from "react";
import { config } from "lgservice";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default class UsbMonitor extends React.Component {
  constructor(){
    super();
    this.waitUnplugUDisk = false;
  }
  componentDidMount() {
    //if(!window.Custom)return;
    var custom = new window.Custom();
    custom.Signage.addUSBAttachEventListener(
      successObject => {
        if(this.waitUnplugUDisk){
          this.waitUnplugUDisk = false;
          this.restartApplication();
          return;
        }
        this.networkAvailable().then(connected => {
          if (!connected) {
            //this.output("Import data from USB");
            this.usbImport();
          }
        });
      },
      failureObject => {
        console.error(
          "[" + failureObject.errorCode + "] " + failureObject.errorText
        );
      }
    );
  }

  networkAvailable() {
   
    return new Promise((resolve, reject) => {
      function successCb(cbObject) {
        console.log(
          "[Network Info] : ",
          cbObject.wired.state,
          cbObject.wifi.state
        );
        var connected =
          cbObject.wired.state === "connected" ||
          cbObject.wifi.state === "connected";
        //self.output('cbObject.wired.state' + connected)
        resolve(connected);
        //Do something
      }

      function failureCb(cbObject) {
        var errorCode = cbObject.errorCode;
        var errorText = cbObject.errorText;
        var err = "Error Code [" + errorCode + "]: " + errorText;
        console.log(err);
        reject(err);
      }

      var deviceInfo = new window.DeviceInfo();
      deviceInfo.getNetworkInfo(successCb, failureCb);
    });
  }

  usbImport() {
    //console.log('import data from usb')
    //检查usb file exists
    const { fileIOInstance } = config.configInstance;
    //USB: [USB_root]:procentric\scap\application\content,file://usb:1对于USB的目录是procentric\scap\application\content
    fileIOInstance
      .listFiles(config.USB_ROOT)
      .then(fileInfos => {
        //console.log("fileinfos", JSON.stringify(fileInfos));
        return fileInfos.files
          .filter(x => {
            return x.type === "file" && x.name.indexOf(".io") > 0;
          })
          .map(x => {
            return `${config.USB_ROOT}/${x.name}`;
          });
      })
      .then(files => {
        console.log("io files", files);
        if (files.length === 0) {
          this.output("usb file not exist");
        } else {
          this.zipFile(files[0]);
        }
      });
  }

  zipFile(usbFile) {
    //this.output("Zip file,waitting to restart app");
    const { fileIOInstance } = config.configInstance;
    fileIOInstance
      .rmdir(`${config.DS_FILE_ROOT}/UploadFiles`)
      .then(() => {
        return fileIOInstance.unzipFile(usbFile, `${config.DS_FILE_ROOT}`);
      })
      .then(() => {
        this.output(
          "Application Update complete. Unplug the U disk and restart the Application...."
        );      
        this.waitUnplugUDisk = true; 
      })
      .catch(err => {
        this.output(err);
      });
  }

  output(message) {
    toast(message);
  }

  restartApplication() {
    
    var configuration = new window.Configuration();
    function successCb() {}
    function failureCb() {}
    configuration.restartApplication(successCb, failureCb);
  }

  // Reboot device
  reboot() {
    var options = {};
    options.powerCommand = window.Power.PowerCommand.REBOOT;

    function successCb() {
      // Do something
    }

    function failureCb(cbObject) {
      var errorCode = cbObject.errorCode;
      var errorText = cbObject.errorText;

      console.log("Error Code [" + errorCode + "]: " + errorText);
    }

    var power = new window.Power();
    power.executePowerCommand(successCb, failureCb, options);
  }

  //copy and extract zip file rerender

  render() {
    return (
      <React.Fragment>
        <ToastContainer
          position="bottom-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnVisibilityChange
          draggable
          pauseOnHover
        />
      </React.Fragment>
    );
  }
}
