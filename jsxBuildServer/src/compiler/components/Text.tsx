import React from "react";
import { IProps, TextProps } from "../Meta";

export const View: React.FC<TextProps & IProps> = ({ text, style }) => {
  return <div style={style}>{text}</div>
}