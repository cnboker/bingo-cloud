import React from "react";
import { TransitionGroup, CSSTransition } from 'react-transition-group';

export type IPlayEffectProps = {
  animation: string
  visible?: boolean
  label: string
  children?: React.ReactNode
}

export const CSSTrans: React.FC<IPlayEffectProps> = (({ label, animation, visible, children }) => {
  // if (visible) {
  //   console.log('playfactory', label)
  // }
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
})