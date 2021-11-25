import React from "react";
import { TransitionGroup, CSSTransition } from 'react-transition-group';

const duration = 300;
declare global {
  interface Window { }
}

export const Animations = ({animation, children }) => {
  return (
    <CSSTransition
      timeout={2000}
      in={true}
      appear={true}
      classNames={animation}>
      <React.Fragment>
        {children}
      </React.Fragment>
    </CSSTransition>
  )
}