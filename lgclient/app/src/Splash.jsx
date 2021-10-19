import React, { useEffect } from "react";
import { config } from "lgservice";
import { useHistory } from "react-router";

export default() => {
    const message = "System is intailizing,please wait"
    const history = useHistory()

    useEffect(() => {
        config
            .instance
            .licenseRead()
            .then(license => {
                if (license.token) {
                    history.push("/play");
                } else {
                    history.push("/qrconfig");
                }
            })
            .catch(e => {
                console.log("go to qrconfig", e);
                history.push("/qrconfig");
            });
    }, [])

    return (
        <div className="centercontainer">
            <div className="centercontent">
                <img src="512x512.png" alt=""/>
                <div className="alert alert-info" role="alert">
                    { message }
                </div>
            </div>
        </div>
    );
};
