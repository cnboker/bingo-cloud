import React from 'react'
import { ViewProps } from '../Meta';

export const View: React.FC<ViewProps> = ({ children }) => {
  return <React.Fragment>  
    {children}
  </React.Fragment>
}