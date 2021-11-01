import React from 'react'
import { ImageProps } from '../Meta';

export const Image : React.FC<ImageProps> = ({src})=>{  
  return  (
    
      <img src={src} />
    
    )
}