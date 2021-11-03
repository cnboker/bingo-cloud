import React from 'react'
import { ImageProps, IProps } from '../Meta';

export const Image : React.FC<ImageProps&IProps> = ({style,src})=>{  
  return  (
      <img src={src} style={style}/> 
    )
}