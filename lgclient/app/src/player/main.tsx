import * as React from "react";
import { IContentWorker, getService,serviceRegister } from "lgservice";
import Shim from "./components/Shim";
import config from "../config";
import WebpagePlayer from "./components/WebpagePlayer";

const worker = getService<IContentWorker>();

export default class Main extends React.Component<{}, any> {
    constructor(props: {}) {
        super(props);
        this.state = {
            shim: true,
            url: ""//key change recreate playlist component
        };
    }

    componentDidMount() {
        var self = this;
        serviceRegister();
        worker.execute(() => {
            self.setState({ url: `${config.REACT_APP_LG_URL}index.html`, shim: false });
        });
    }

    render() {
        var shim = this.state.shim;
        return (
            <React.Fragment>
                { shim ? <Shim /> : <WebpagePlayer url={ this.state.url } /> }
            </React.Fragment>
        );
    }
}
