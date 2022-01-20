import React from "react";
import Iframe from "react-iframe";

export default class WebpagePlayer extends React.Component {
    render() {
        return (
            <Iframe
                url={ this.props.url }
                width="100%"
                height="100%"
                className="myIframe"
                display="initial"
                position="relative"
                scrolling="no"
                style={ { "frameBoarder":0 } }
            />
        );
    }
}

