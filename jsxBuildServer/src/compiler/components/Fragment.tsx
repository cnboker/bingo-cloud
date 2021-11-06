import React from 'react'
import { FragementProps } from '../Meta';

export const Fragment: React.FC<FragementProps> = ({ children }) => {
  return <React.Fragment>
    {children}
  </React.Fragment>
}