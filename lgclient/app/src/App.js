import React from "react";
import { Route, BrowserRouter as Router, Switch } from "react-router-dom";
import QRConfig from "./QRConfigrator/index";
import Splash from "./Splash";
import Main from "./player/main";
import { hot } from "react-hot-loader/root";
import "animate.css";

class App extends React.Component {
    render() { 
        return (
            <Router>
                <Switch>
                    <Route path="/qrconfig" component={ QRConfig }/>
                    <Route path="/play" component={ Main }/>
                    <Route path="/" extact component={ Splash }/>
                </Switch>
            </Router>
        );
    }
}
export default hot(App);
