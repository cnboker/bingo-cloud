import React from "react";
import { Playlist } from "./Playlist";
import util from "../../util";
import { IPlayProps } from "../Meta";
import Clock from './analogClock/Index'


export const fetchNext = (
  source: Array<IPlayProps>
) => {
  if (source.length === 0) return null;
  const next = source.shift();
  source.push(next);
  return { ...next };
};

export const peek = (source: Array<IPlayProps>) => {
  return source[0];
};

export const Viewport: React.FC<Array<IPlayProps>> = (source) => {
  const data = Object.values(source);
  for (const item of data) {
    item.label = util.makeid(6);
  }

  return (
    <div className="container">
      <Playlist source={data} />
    </div>
  );
};
