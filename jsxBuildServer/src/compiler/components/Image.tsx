import React from 'react'
import { ImageProps } from '../Meta';
import * as CSS from 'csstype'

export const Image : React.FC<ImageProps> = ({src})=>{  
  //下载到设备需要获取本地资源播放
  const url = new URL(src)
  const style : CSS.Properties={
    height:'100vh',
    width:'100%'
  }
  return  (
      <img src={`${url.pathname}`} style={style}/> 
    )
}