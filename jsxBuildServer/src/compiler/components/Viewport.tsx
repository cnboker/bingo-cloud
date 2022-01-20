import React from "react";
import { ViewProps } from "../Meta";

export const Viewport: React.FC<ViewProps> = ({ children }) => {
  return <div style={{ backgroundColor: "#4A4A4A" }}>{children}</div>;
};
