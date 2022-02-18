import React, { useState } from "react";
import { PlayList } from "./Playlist";

export const Viewport = (props) => {
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

  return (<div className="container">
    <PlayList {...props} />
  </div>

  )
}
