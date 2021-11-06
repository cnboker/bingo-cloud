import React from "react";
import { ImageListProps, IProps } from "../Meta";
import Slider from "@farbenmeer/react-spring-slider";

export const ImageList: React.FC<ImageListProps & IProps> = ({
  style,
  images,
  duration
}) => {
  return (
    <Slider auto={duration}>
      {images.map((x, index) => {
        return (
          <div>
            <img src={x} style={style} key={`key${index}`} />
          </div>
        );
      })}
    </Slider>
  );
};
