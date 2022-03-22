import React from "react";
import { SeamlessPlayer, SeamlessDataProps } from "./SeamlessPlayer";
import util from "../../util";
import { IPlayProps } from "../Meta";

export const fetchNext = (
  source: Array<IPlayProps>,
  autoPlay: boolean = false
) => {
  if (source.length === 0) return null;
  const next = source.shift();
  next.autoPlay = autoPlay;
  source.push(next);
  return { ...next };
};

export const peek = (source: Array<IPlayProps>, autoPlay: boolean = false) => {
  source[0].autoPlay = autoPlay;
  return source[0];
};

export const Viewport: React.FC<Array<IPlayProps>> = (source) => {
  console.log("source", source);
  const data = Object.values(source);
  for (const item of data) {
    item.label = util.makeid(6);
  }

  const dataProps: SeamlessDataProps = {
    playProps: fetchNext(data, true),
    nextProps: fetchNext(data, false),
  };

  return (
    <div className="container">
      {" "}
      <SeamlessPlayer {...dataProps} source={data} />
    </div>
  );
};
