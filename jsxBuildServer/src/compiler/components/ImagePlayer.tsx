import React, { useEffect } from 'react'
import { IImageProps } from '../Meta';
import * as CSS from 'csstype'

export const ImagePlayer: React.FC<IImageProps> = ({ label, url, exit, duration }) => {
  //下载到设备需要获取本地资源播放
  const style: CSS.Properties = {
    height: '100vh',
    width: '100%'
  }

  useEffect(() => {
    //console.log('image play:', url)
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

// export default React.memo(ImagePlayer, (prev, next) => {
//   //console.log('propsAreEqual', prev, next)
//   return prev.url === next.url && prev.autoPlay === next.autoPlay
// })