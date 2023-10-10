import React from "react";
import { Button as MaterialButton } from "@mui/core";
import { useNode } from "@craftjs/core";
export const Button = ({ size, variant, color, children }) => {
  const {connectors:{connect, drag}} = useNode();
  return (
    <MaterialButton
      size={size}
      variant={variant}
      color={color}
      ref={ref=>connect(drag(ref))}
    >{children}</MaterialButton>
  );
};
