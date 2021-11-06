import React from 'react'
import { ImageProps } from '../Meta';
import * as CSS from 'csstype'

export const Image : React.FC<ImageProps> = ({src})=>{  
  const style : CSS.Properties={
    height:'100vh',
    width:'100%'
  }
  return  (
      <img src={src} style={style}/> 
    )
}