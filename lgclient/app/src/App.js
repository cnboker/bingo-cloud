import React from "react";
import {BrowserRouter as Router, Route, Switch} from "react-router-dom";
import QRConfig from "./QRConfigrator/indexContainer";
import Splash from "./Splash";
import Main from "./player/main";
import UsbMonitor from './UsbMonitor';
import VideoTest from './vidoeTest'
import {hot} from "react-hot-loader/root";
import "animate.css";
import { getOSInfo } from "./serviceAPI/deviceCaller";

class App extends React.Component {
  componentDidMount() {
    getOSInfo().then(obj => {
      console.log('getOSInfo',obj)
    })
  }

  render() {
    return (
      <Router>
        <div>
          
          <Switch>
            <Route path="/qrconfig" component={QRConfig}/>
            <Route path="/play" component={Main}/>
            <Route path="/" extact component={VideoTest}/>
          </Switch>
        </div>
      </Router>
    );
  }
}
export default hot(App);
