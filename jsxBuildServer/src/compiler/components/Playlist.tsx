import React, { useState } from "react";
import { IPlayProps } from "../Meta";
import { PlayFactory } from "./PlayFactory";
import { CSSTrans } from "./CSSTrans";

export const PlayList: React.FC<Array<IPlayProps>> = (props) => {
  const [visibleIndex, setVisibleIndex] = useState(0);
  const data = Object.values(props)

  const itemRender = (x: IPlayProps, index) => {
    return (
      visibleIndex === index && (
        <CSSTrans
          key={'key' + index}
          animation={x.animation}
        >
          <PlayFactory {...x} exit={() => {
            setVisibleIndex((vi) => {
              if (vi < data.length - 1) {
                return vi + 1;
              } else {
                return 0;
              }
            });
          }} />
        </CSSTrans>
      )
    );
  };

  return (
    <React.Fragment>
      {data.map((x, index) => {
        return itemRender(x, index);
      })}
    </React.Fragment>
  );
};
