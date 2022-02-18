import React from 'react'
import { IImageProps, IPageProps, IPlayProps, IVideoProps } from '../Meta'
import { Image } from './Image'
import { PagePlayer } from './PagePlayer'
import { VideoPlayer } from './VideoPlayer'

export const PlayFactory: React.FC<IPlayProps> = ({ type, ...props }) => {
    if (type === 'image') {
        return <Image {...props as IImageProps} />
    } else if (type === 'video') {
        return <VideoPlayer {...props as IVideoProps} />
    } else if (type === 'page') {
        return <PagePlayer {...props as IPageProps} />
    }
    return null
}
