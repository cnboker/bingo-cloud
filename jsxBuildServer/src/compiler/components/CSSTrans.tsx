import React from "react";
import { TransitionGroup, CSSTransition } from 'react-transition-group';
import { IPlayProps } from "../Meta";


export const CSSTrans = (props: IPlayProps) => {
  const { label, animation, visible, children, ...rest } = props

  // const childrenWithProps = React.Children.map(children, child => {
  //   // Checking isValidElement is the safe way and avoids a typescript
  //   // error too.
  //   if (React.isValidElement(child)) {
  //     return React.cloneElement(child, rest);
  //   }
  //   return child;
  // })

  return (
    <>
      <TransitionGroup>
        <CSSTransition
          timeout={2000}
          in={true}
          appear={true}
          classNames={animation}>
          <div className={`view ${visible ? '' : 'view-hidden'}`}>
            {children}</div>
        </CSSTransition>
      </TransitionGroup>
    </>
  )
}