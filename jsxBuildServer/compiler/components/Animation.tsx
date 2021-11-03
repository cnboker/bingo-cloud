import React from "react";
import { AnimationProps } from "../Meta";

export const Animation: React.FC<AnimationProps> = ({ children, action }) => {
  const className = `animated ${action}`;
  return <div className={className}>{children}</div>;
};
