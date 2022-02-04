import React from "react";
import { MetaComponent } from "./MetaComponent";
import * as CL from "./components/Index";

type IMetaMap<T> = {
  rootId: string;
  map: IMap<T>;
};

type IMetaData = {
  tag: string;
  childrenIds: string[];
};

type IMap<T> = {
  [key: string]: IMetaData;
};

export const Renderer = ({ rootId, map }) => {
  const root = map[rootId];
  const { childrenIds, ...rest } = root;

  const childrenRender = (childrenIds: string[] | null) => {
    if (!childrenIds) return null;
    return childrenIds.map((x, index) => {
      const child = map[x];
      const { childrenIds, ...rest } = child;
      // console.log('map[child.tag]',CL[child.tag])
      return (
        <MetaComponent {...rest} key={index} tag={CL[child.tag]}>
          {childrenRender(child.childrenIds)}
        </MetaComponent>
      );
    });
  };

  return (
    <>
      <MetaComponent {...rest} tag={CL[root.tag]}>
        {childrenRender(childrenIds)}
      </MetaComponent>
    </>
  );
};
