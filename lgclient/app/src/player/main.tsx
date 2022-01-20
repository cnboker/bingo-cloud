import React, { useEffect, useState } from "react";
import { IContentWorker, getService, serviceRegister } from "lgservice";
import Shim from "./components/Shim";
import config from "../config";
import WebpagePlayer from "./components/WebpagePlayer";

export default () => {
  const [shim, setShim] = useState(true);
  const [url, setUrl] = useState("");

  useEffect(() => {
    serviceRegister();
    const worker = getService("IContentWorker") as IContentWorker;
    worker.execute(() => {
      setShim(false);
      setUrl(`${config.REACT_APP_LG_URL}index.html?${Date.now()}`);
    });
  }, []);
  return (
    <React.Fragment>
      {shim ? <Shim /> : <WebpagePlayer url={url} />}
    </React.Fragment>
  );
};
