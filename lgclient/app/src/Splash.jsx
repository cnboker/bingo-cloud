import React, { useEffect } from "react";
import { configer } from "lgservice";
import { useHistory } from "react-router";

export default() => {
    const message = "System is intailizing,please wait";
    const history = useHistory();

    useEffect(() => {
        configer
            .instance
            .read()
            .then(c => {
                if (c.token) {
                    history.push("/play");
                } else {
                    history.push("/qrconfig");
                }
            })
            .catch(e => {
                console.log("go to qrconfig", e);
                history.push("/qrconfig");
            });
    }, []);

    return (
        <div className="centercontainer">
            <div className="centercontent">
                <img src="256x256.png" alt=""/>
                <div className="alert alert-info" role="alert">
                    { message }
                </div>
            </div>
        </div>
    );
};
