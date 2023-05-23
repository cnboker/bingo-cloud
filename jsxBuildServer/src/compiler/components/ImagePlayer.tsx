import React, { useEffect } from 'react'
import { IImageProps } from '../Meta';
import * as CSS from 'csstype'

export const ImagePlayer: React.FC<IImageProps> = ({ url, exit, duration }) => {
  //下载到设备需要获取本地资源播放
  const style: CSS.Properties = {
    height: '100vh',
    width: '100%'
  }

  useEffect(() => {
    const timer: ReturnType<typeof setTimeout> = setTimeout(() => {

      if (exit) {
        exit();
      }
    }, duration);
    return () => clearTimeout(timer);
  }, [url]); 

  return (
    <img src={url} style={style} />
  )
}
