import React from "react";
import { config } from "lgservice";
import moment from "moment";
import { connect } from "react-redux";
import { requestLicense } from "./QRConfigrator/actions";

class Splash extends React.Component {
  constructor() {
    super();
    this.state = {
      message: "System is intailizing,please wait",
      networkOffline: false
    };
    this.license = null;
  }

  componentDidMount() {
    //config.configInstance.licenseReset();
    var timer = setTimeout(() => {
      clearTimeout(timer);
      config.configInstance
        .licenseRead()
        .then(license => {
          this.license = license;
          this.checkLicense(license);
        })
        .catch(e => {
          console.log("go to qrconfig", e);
          this.props.history.push("/qrconfig");
        });
    }, 2000);
  }

  checkLicense(license) {
    var inValid =
      moment().diff(license.activationdDate, "days") > license.validDays;
    license.inValid = inValid;
    console.log(
      "license inValid",
      inValid,
      license,
      moment().diff(license.activationdDate, "days")
    );
    if (inValid) {
      this.props.requestLicense(license.token, license.deviceId);
    } else {
      this.relayRedirect("/play");
    }
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevProps.qrState !== this.props.qrState) {
      const { license } = this.props.qrState;
      if (license.certification !== this.license.certification) {
        console.log("更新证书");
        this.license.activationdDate = license.activationdDate;
        this.license.certification = license.certification;
        this.license.generateDate = license.generateDate;
        this.license.validDays = license.validDays;
        var inValid =
          moment().diff(license.activationdDate, "days") > license.validDays;
        license.inValid = inValid;
        config.configInstance.licenseWrite(license).then(err => {
          if (err) {
            console.log("write license file error", err);
          }
        });
        this.relayRedirect("/play");
      }
      // Do whatever you want
    }
  }

  relayRedirect(url) {
    var timer = setTimeout(() => {
      clearTimeout(timer);
      this.props.history.push(url);
    }, 2000);
  }

  reset() {
    config.configInstance.licenseReset();
  }

  reload() {
    window.location.reload();
  }

  play() {
    this.props.history.push("/play");
  }

  isDisconnected() {
    this.setState({ networkOffline: true });
  }

  usbImport() {
    console.log("import data from usb");
  }

  render() {
    return (
      <div className="centercontainer">
        <div className="centercontent">
          <img src="icon.png" alt="" />
          <div className="alert alert-info" role="alert">
            {this.state.message}
          </div>
          <button onClick={this.reset.bind()}>reset</button>
          <button onClick={this.reload.bind()}>reload</button>
          <button onClick={this.play.bind()}>player</button>
        </div>
      </div>
    );
  }
}

const mapStateToProps = state => ({
  qrState: state.qrReducer
});

const mapDispatchToProps = (dispatch, ownProps) => {
  return {
    dispatch,
    requestLicense: (token, key) => dispatch(requestLicense(token, key))
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(Splash);
