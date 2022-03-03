import React from 'react'
import { IPlayProps } from '../Meta'
import { Image } from './Image'
import { PagePlayer } from './PagePlayer'
import VideoPlayer from './VideoPlayer'

const components = []

const PlayFactory: React.FC<Omit<IPlayProps, 'animation' | 'visible'>> = ({ type, autoPlay, ...props }) => {
    let Component 
    //console.log('components',components)
    if (type === 'image') {
        Component = (Image)
    } else if (type === 'video') {
        Component = components.shift()
        components.push(Component)
    } else if (type === 'page') {
        Component = (PagePlayer)
    }
   
    return <Component {...props} />
}


export default PlayFactory
