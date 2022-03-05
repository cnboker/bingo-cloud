import React from 'react'
import { IPlayProps } from '../Meta'
import { ImagePlayer } from './ImagePlayer'
import { PagePlayer } from './PagePlayer'
import VideoPlayer from './VideoPlayer'


const components = [<VideoPlayer />, <VideoPlayer />]

const PlayFactory: React.FC<Omit<IPlayProps, 'animation' | 'visible'>> = ({ type, autoPlay, ...props }) => {
    let Component
    if (type === 'image') {
        Component = (ImagePlayer)
    } else if (type === 'video') {
        Component = components.shift()
       
        Component = React.cloneElement(Component, props, null)
        Component.props = props
        //console.log('Component video',Component)
        components.push(Component)
        return Component
    } else if (type === 'page') {
        Component = (PagePlayer)
    }

    return <Component {...props} />
}


export default PlayFactory
