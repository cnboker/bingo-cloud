import React, { useState } from "react";
import { PlayList } from "./Playlist";
import { SeamLessPlayer } from "./SeamlessPlayer";
import { Demo } from "./SeamlessVideoPlayer";
import VideoPlayer from "./VideoPlayer";

export const Viewport = (props) => {
  //const [autoPlayIndex, setAutoPlayIndex] = useState(0)
  // const playViews = children as IPlayView<T>[]
  // const [currentIndex, setCurrentIndex] = useState(0)

  //const forceUpdate: () => void = React.useState()[1].bind(null, {})

  // const childrenProps = React.Children.map(children, (child, index) => {
  //   const view = child as IPlayView<T>
  //   if (view) {
  //     return React.cloneElement(child, {
  //       visible: currentIndex === index,
  //       exit: () => {
  //         console.log('exit', currentIndex)
  //         if (currentIndex < playViews.length - 1) {
  //           setCurrentIndex(currentIndex + 1)
  //         } else {
  //           setCurrentIndex(0)
  //         }
  //       }
  //     })
  //   } else {
  //     throw 'viewport child must be IPlayView'
  //   }
  // })

  // return (<div className="container">
  //   {/* <PlayList {...props} /> */}
  //   <div className={`view ${autoPlayIndex == 0 ? '' : 'view-hidden'}`}>
  //     <VideoPlayer url="/admin/2.mp4" autoPlay={autoPlayIndex == 0} exit={() => setAutoPlayIndex(1)} /></div>
  //   <div className={`view ${autoPlayIndex == 1 ? '' : 'view-hidden'}`}>
  //     <VideoPlayer url="/admin/4k.mp4" autoPlay={autoPlayIndex == 1} exit={() => setAutoPlayIndex(0)} /></div>
  // </div>

  //)
  return <Demo />
}
