import React from "react";
import Iframe from "react-iframe";

export default class WebpagePlayer extends React.Component {
    render() {
        return (
            <Iframe
                url={ this.props.content.url }
                width="100%"
                height="100%"
                className="myIframe"
                display="initial"
                position="relative"
                style={ { "frameBoarder":0 } }
            />
        );
    }
}

WebpagePlayer.defaultProps = {
    content:{
        "url": "http://www.baidu.com",
        "snapshotUrl": null,
        "duration": 0,
        "contentType": 6
    } 
};
