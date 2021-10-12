import React from "react";
import QRCode from "qrcode.react";
import { getDeviceInfo } from "../serviceAPI/deviceCaller";
import { config } from "lgservice";

const RunStep = Object.freeze({
  RequestQR: 1,
  RequestToken: 2,
  RequestLicense: 3,
  Finished: 4
});

export default class QRConfig extends React.Component {
  constructor() {
    super();
    this.state = {
      runStep: RunStep.RequestQR,
      intervalId: null
    };
    //deviceId
    this.key = "";
  }

  componentDidMount() {
    this.mkdsDir();
    this.props.requestQR();

    var intervalId = setInterval(this.timer.bind(this), 5000);
    this.setState({ intervalId });

    getDeviceInfo().then(obj => {
      console.log("deviceinfo", obj);
    });
  }

  mkdsDir() {
    //creat ds directory
    const { fileIOInstance } = config.configInstance;

    fileIOInstance
      .exists("")
      .then(exist => {
        if (!exist) {
          fileIOInstance.mkdir("");
        }
      })
      .catch(e => {
        console.log("mkdsDir", e);
      });
  }

  async timer() {
    const { QR, token, license, instance } = this.props.qrState;
    console.log("instance=", instance);
    if (QR.qrUrl && this.state.runStep === RunStep.RequestQR) {
      this.setState({ runStep: RunStep.RequestToken });
      this.props.requestToken(QR.authorizeCode);
    } else if (
      !token.access_token &&
      this.state.runStep === RunStep.RequestToken
    ) {
      this.props.requestToken(QR.authorizeCode);
    } else if (
      token.access_token &&
      this.state.runStep === RunStep.RequestToken
    ) {
      this.props.requestInstance(token.access_token);
      this.setState({ runStep: RunStep.RequestLicense });
      getDeviceInfo().then(obj => {
        this.key = obj.macAddress;
        this.props.postDeviceInfo(
          token.access_token,
          obj.macAddress,
          obj.name,
          obj.ip,
          obj.os,
          obj.resolution,
          QR.authorizeCode
        );
      });
    } else if (
      !license.certification &&
      this.state.runStep === RunStep.RequestLicense
    ) {
      this.props.requestLicense(token.access_token, this.key);
    } else if (
      license.certification &&
      this.state.runStep === RunStep.RequestLicense
    ) {
      this.setState({ runStep: RunStep.Finished });
      license.dsUrl = instance.server;
      this.saveLicense(token);
      this.activeDevice(license);
      clearInterval(this.state.intervalId);
      this.props.history.push("/play");
    }
  }

  activeDevice(license) {
    var url = `${license.apiUrl}api/register`;
    getDeviceInfo().then(obj => {
      this.key = obj.macAddress;
      this.props.register(
        license.token,
        url,
        obj.macAddress,
        obj.name,
        obj.ip,
        obj.os,
        obj.resolution
      );
    });
  }

  async saveLicense(token) {
    const { license } = this.props.qrState;
    license.token = token.access_token;
    console.log("save license", license);
    config.configInstance.licenseWrite(license).then(err => {
      if (err) {
        console.log("write license file error", err);
      }
    });
  }

  componentWillUnmount() {
    clearInterval(this.state.intervalId);
  }

  render() {
    const { QR } = this.props.qrState;
    var divStyles = {
      margin: "0 auto",
      top: "30%",
      position: "absolute"
    };
    return (
      <div className="container-fluid" style={divStyles}>
        <div className="row">
          <video width="1280" height="640" preload src="http://192.168.50.71:8888/4k.mp4" controls autoplay>
            
          </video>
        </div>
        <div className="row">
          <div className="col">
            {QR.qrUrl &&
              <QRCode value={QR.qrUrl} size={256} className="float-right" />}
          </div>
          <div className="col" style={{ padding: "5%" }}>
            <h1>Please scan QR code to activate device.</h1>
          </div>
        </div>
      </div>
    );
  }
}
