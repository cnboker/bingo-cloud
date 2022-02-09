import React, { useEffect, useState } from "react";
import { TransitionGroup, CSSTransition } from "react-transition-group";
import { ImageListProps } from "../Meta";
import { Image } from "./Image";

export const ImageList = <T extends unknown>({
  urls,
  duration,
  animation,
  exit,
}: ImageListProps<T>) => {
  //console.log('urls',urls)
  const [visibleIndex, setVisibleIndex] = useState(0);
  useEffect(() => {
    const timer: ReturnType<typeof setInterval> = setInterval(() => {
      setVisibleIndex((vi) => {
        if (vi < urls.length - 1) {
          return vi + 1;
        } else {
          //console.log("clearInterval");
          //vi = 0;
          clearInterval(timer);
          if (exit) {
            exit();
          }
          return vi;
        }
      });
    }, duration);
    return () => clearInterval(timer);
  }, []);

  //console.log('visibleIndex', visibleIndex, urls.length)

  const itemRender = (x, index) => {
    return (
      visibleIndex === index && (
        <CSSTransition
          key={"key" + index}
          timeout={2000}
          classNames={animation}
        >
          <div className="view">
            <Image src={x} />
          </div>
        </CSSTransition>
      )
    );
  };

  return (
    <React.Fragment>
      <TransitionGroup>
        {urls.map((x, index) => {
          return itemRender(x, index);
        })}
      </TransitionGroup>
    </React.Fragment>
  );
};
