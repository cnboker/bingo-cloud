import React from 'react'
import { AnimationProps } from '../Meta';

export const Animation: React.FC<AnimationProps> = ({ children, action }) => {
  return <React.Fragment>
    {children}
  </React.Fragment>
}