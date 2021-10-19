import React from "react";

export default class Shim extends React.Component {
    componentDidMount() {}
    render() {
        return (
     
            <div className="centercontainer">
                <div className="centercontent">
                    <h1>The system is ready, waiting for the server to push data</h1>
                </div>
            </div>
     
        );
    }
}
