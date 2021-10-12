import { connect } from "react-redux";
import {
  requestQR,
  requestToken,
  postDeviceInfo,
  requestLicense,
  requestInstance,
  register
} from "./actions";
import QRConfig from "./index";

const mapStateToProps = state => ({
  qrState: state.qrReducer
});

const mapDispatchToProps = (dispatch, ownProps) => {
  return {
    dispatch,
    requestQR: () => dispatch(requestQR()),
    requestToken: authorizeCode => dispatch(requestToken(authorizeCode)),
    postDeviceInfo: (token, mac, name, ip, os, resolution, authorizeCode) =>
      dispatch(
        postDeviceInfo(token, mac, name, ip, os, resolution, authorizeCode)
      ),
    register: (token,url, mac, name, ip, os, resolution) =>
      dispatch(register(token,url, mac, name, ip, os, resolution)),
    requestLicense: (token, key) => dispatch(requestLicense(token, key)),
    requestInstance:(token)=>dispatch(requestInstance(token))
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(QRConfig);
