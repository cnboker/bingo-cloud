import React, { useState } from "react";
import Iframe from "react-iframe";
import CircleLoader from "react-spinners/CircleLoader";

export default ({ url }) => {
  let [loading, setLoading] = useState(true);
  const override = `
            display: block;
            margin: 0 auto;
            top: 50%;
            `;
  const hideSpinner = () => {
    setLoading(false);
  };
  return (
    <div style={{ height: "100%", wdith: "100%" }}>
      <Iframe
        onLoad={hideSpinner}
        url={url}
        width="100%"
        height="100%"
        className="myIframe"
        display="initial"
        position="relative"
        scrolling="no"
        allowtransparency="true"
        style={{
          frameBoarder: 0,
          backgroundColor: "#000",
          display: loading ? "none" : "",
        }}
      />

      <CircleLoader
        color={"#9B9B9B"}
        loading={loading}
        css={override}
        size={150}
      />
    </div>
  );
};
