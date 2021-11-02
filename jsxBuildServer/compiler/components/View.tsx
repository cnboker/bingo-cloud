import React from 'react'
import { ViewProps } from '../Meta';

export const View: React.FC<ViewProps> = ({ children }) => {
  return <React.Fragment>
    <h1>View</h1>
    {children}
  </React.Fragment>
}