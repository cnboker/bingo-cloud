import React from "react";
import Intro from "./Intro";
import Days7Message from "./Days7Message";
import Days7Warning from "./Days7Warning";
import Days7Stats from "./Days7Stats";

export default(props) => {
  return (
    <React.Fragment>
      <Intro {...props}/>
      <Days7Stats {...props}/>
      <Days7Warning {...props}/>
      <Days7Message {...props}/>
    </React.Fragment>
  );
};
