import React from "react";
import { TransitionGroup, CSSTransition } from 'react-transition-group';

export const CSSTrans = ({ animation, children }) => {
  return (
    <React.Fragment>
      {animation && <TransitionGroup>
        <CSSTransition
          timeout={2000}
          in={true}
          appear={true}
          classNames={animation}>
          <div className="view">
            {children}</div>
        </CSSTransition></TransitionGroup>}
      {!animation && <div>{children}</div>}
    </React.Fragment>
  )
}