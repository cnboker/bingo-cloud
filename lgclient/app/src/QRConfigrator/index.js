import React, { useEffect, useState } from "react";
import QRCode from "qrcode.react";
import { getDeviceInfo } from "./api";
import { configer, webosApis } from "lgservice";
import {
  postDeviceInfo,
  requestConfig,
  requestQR,
  requestToken,
} from "./actions";
import { useDispatch, useSelector } from "react-redux";
import { useHistory } from "react-router";
import { useInterval } from "../useInterval";
export default () => {
  const RunStep = Object.freeze({
    RequestQR: 1,
    RequestToken: 2,
    RequestConfig: 3,
    Finished: 4,
  });
  const { appbootInstall, httpserverInstall } = webosApis.bootservice;
  const [runStep, setRunStep] = useState(RunStep.RequestQR);
  const [message, setMessage] = useState();
  const [id, setId] = useState();
  const delay = 5000;
  const dispatch = useDispatch();
  const history = useHistory();
  const qrState = useSelector((state) => state.qrReducer);
  const { QR, token, configInfo } = qrState;

  const stateLoop = () => {
    console.log("qr", qrState);
    if (QR.qrUrl && runStep === RunStep.RequestQR) {
      setRunStep(() => RunStep.RequestToken);
      setMessage(() => "request token...");
      dispatch(requestToken(QR.authorizeCode));
    } else if (!token.access_token && runStep === RunStep.RequestToken) {
      dispatch(requestToken(QR.authorizeCode));
    } else if (token.access_token && runStep === RunStep.RequestToken) {
      setMessage(() => "upload device information...");
      setRunStep(() => RunStep.RequestConfig);
      getDeviceInfo().then((deviceInfo) => {
        const { wired_addr } = deviceInfo;
        setId(wired_addr);
        dispatch(
          postDeviceInfo(token.access_token, QR.authorizeCode, deviceInfo),
        );
      });
    } else if (!configInfo.fileServer && runStep === RunStep.RequestConfig) {
      setMessage(() => "request config information...");
      console.log("request config...");
      dispatch(requestConfig(token.access_token));
    } else if (configInfo.fileServer && runStep === RunStep.RequestConfig) {
      setRunStep(() => RunStep.Finished);
      setMessage(() => "config finished!");
      saveConfig();
      history.push("/play");
    }
  };

  useInterval(stateLoop, delay);

  useEffect(() => {
    httpserverInstall()
      .then(() => {
        return appbootInstall();
      })
      .then((res) => {
        console.log("install->", res);
      });
    dispatch(requestQR());
  }, []);

  const saveConfig = () => {
    configInfo.token = token.access_token;
    configInfo.deviceId = id;
    console.log("save configInfo", configInfo);
    configer.instance
      .write(configInfo)
      .then(() => {
        console.log("write configInfo success");
      })
      .catch((e) => {
        console.log("write config file error", e);
      });
  };

  const divStyles = {
    margin: "0 auto",
    top: "30%",
    position: "absolute",
  };

  return (
    <div className="container-fluid" style={divStyles}>
      <div className="row">
        <div className="col">
          {QR.qrUrl && (
            <QRCode value={QR.qrUrl} size={256} className="float-right" />
          )}
        </div>
        <div
          className="col"
          style={{
            padding: "5%",
          }}
        >
          <h1>Scan QR code to activate device,Please.</h1>
          <div>
            * Ensure activate a trial or purchase the license in PC before you
            scan the QR code
          </div>
          <div>{message}</div>
        </div>
      </div>
    </div>
  );
};
