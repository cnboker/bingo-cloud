import React, { useEffect, useState } from "react";
import QRCode from "qrcode.react";
import { requestDeviceInfo } from "./api";
import { config, webosApis } from "lgservice";
import {
    postDeviceInfo,
    requestInstance,
    requestLicense,
    requestQR,
    requestToken
} from "./actions";
import { useDispatch, useSelector } from "react-redux";
import { useHistory } from "react-router";

export default () => {
    const RunStep = Object.freeze({
        RequestQR: 1,
        RequestToken: 2,
        RequestLicense: 3,
        Finished: 4
    });
    const { exists, mkdir } = webosApis.webosFileService;
    const { appbootInstall, httpserverInstall } = webosApis.bootservice;
    const [runStep, setRunStep] = useState(RunStep.RequestQR);
    const [id, setId] = useState();
    const delay = 5000;
    const dispatch = useDispatch();
    const history = useHistory();
    const qrState = useSelector(state => state.qrReducer);
    const { QR, token, license } = qrState;
    const { APP_ROOT } = config;

    useEffect(() => {
        httpserverInstall()
            .then(() => {
                return appbootInstall();
            }).then(res => {
                console.log("install->", res);
            });
        dirReady();
        dispatch(requestQR());
    }, []);

    useEffect(() => {
        let timerId = setInterval(() => {
            stateLoop();
        }, delay);
        return () => clearInterval(timerId);
    }, []);

    const dirReady = () => {
        exists(APP_ROOT)
            .then(exist => {
                if (!exist) {
                    return mkdir(APP_ROOT);
                }
                return true;
            })
            .then(res => {
                console.log(res);
            })
            .catch(e => {
                console.log("mkdsDir", e);
            });
    };

    const stateLoop = () => {
        if (QR.qrUrl && runStep === RunStep.RequestQR) {
            setRunStep(RunStep.RequestToken);
            dispatch(requestToken(QR.authorizeCode));
        } else if (!token.access_token && runStep === RunStep.RequestToken) {
            dispatch(requestToken(QR.authorizeCode));
        } else if (token.access_token && runStep === RunStep.RequestToken) {
            setRunStep(RunStep.RequestLicense);
            requestDeviceInfo().then(deviceInfo => {
                const { wired_addr } = deviceInfo;
                setId(wired_addr);
                dispatch(
                    postDeviceInfo(token.access_token, QR.authorizeCode, deviceInfo)
                );
            });
        } else if (!license.resourceServer && runStep === RunStep.RequestLicense) {
            dispatch(requestLicense(token.access_token, id));
        } else if (license.resourceServer && runStep === RunStep.RequestLicense) {
            setRunStep(RunStep.Finished);
            saveLicense(token);
            history.push("/play");
        }
    };

    const saveLicense = token => {
        license.token = token.access_token;
        console.log("save license", license);
        config.instance.write(license).then(err => {
            if (err) {
                console.log("write license file error", err);
            }
        });
    };

    const divStyles = {
        margin: "0 auto",
        top: "30%",
        position: "absolute"
    };

    return (
        <div className="container-fluid" style={divStyles}>
            <div className="row">
                <div className="col">
                    {QR.qrUrl &&
                        <QRCode value={QR.qrUrl} size={256} className="float-right" />}
                </div>
                <div
                    className="col"
                    style={{
                        padding: "5%"
                    }}
                >
                    <h1>Scan QR code to activate device,Please.</h1>
                </div>
            </div>
        </div>
    );
};
