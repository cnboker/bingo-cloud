import React from 'react'
import { ViewProps } from '../Meta';

export const View: React.FC<ViewProps> = ({ children }) => {
  return <React.Fragment>
    <h1>a</h1>
    {children}
  </React.Fragment>
}