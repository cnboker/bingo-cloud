import React, { useRef, useState } from 'react'
import { IImageProps, IPageProps, IVideoProps } from '../Meta'
import { ImagePlayer } from './ImagePlayer'
import { PagePlayer } from './PagePlayer'
import VideoPlayer from './VideoPlayer'
import { TransitionGroup, CSSTransition } from 'react-transition-group';
type SeamlessDataProps = {
    nextProps: IVideoProps | IImageProps | IPageProps
    playProps: IVideoProps | IImageProps | IPageProps,

}


type SeamlessPlayerProps = SeamlessDataProps & {
    currentExit: () => void
}

const v1: IVideoProps = {
    type: 'video',
    autoPlay: true,
    url: '/admin/2.mp4'
}
const v2: IVideoProps = {
    type: 'video',
    autoPlay: false,
    url: '/admin/4k.mp4'
}
const img1: IImageProps = {
    type: 'image',
    autoPlay: false,
    url: '/admin/5.jpeg',
    duration: 5000,
}
const img2: IImageProps = {
    type: 'image',
    autoPlay: false,
    url: '/admin/1.jpeg',
    duration: 5000
}
const data = [img1, img2, v1, v2,]

export const Demo = () => {
    const exit = () => {
        setViewData((cur) => {
            if (cur.playProps.autoPlay) {
                cur.playProps = fetchNext(false)
                cur.nextProps.autoPlay = true
            }
            else if (cur.nextProps.autoPlay) {
                cur.nextProps = fetchNext(false)
                cur.playProps.autoPlay = true
            }
            console.log('data', data)
            return { ...cur }
        })

    }
    const fetchNext = (autoPlay: boolean = false) => {
        const next = data.shift()
        next.autoPlay = autoPlay
        data.push(next)
        return next
    }

    const [viewData, setViewData] = useState<SeamlessDataProps>({
        playProps: fetchNext(true),
        nextProps: fetchNext()
    })


    return <SeamlessVideoPlayer playProps={viewData.playProps} nextProps={viewData.nextProps} currentExit={exit} />
}

export const SeamlessVideoPlayer: React.FC<SeamlessPlayerProps> = ({ playProps, nextProps, currentExit }) => {
    playProps.exit = nextProps.exit = currentExit
    return (<>
        <ViewLayer autoPlay={nextProps.autoPlay}>
            <ViewPlayer {...nextProps} /></ViewLayer>
        <ViewLayer autoPlay={playProps.autoPlay}>
            <ViewPlayer {...playProps} /></ViewLayer>
    </>)
}

const ViewPlayer: React.FC<IVideoProps | IImageProps | IPageProps> = ({ type, ...rest }) => {
    switch (type) {
        case 'image':
            return <ImagePlayer {...rest} />
        case 'page':
            return <PagePlayer {...rest} />
        case 'video':
            return <VideoPlayer {...rest} />
        default:
            return <div>not implemetation</div>
    }
}

const ViewLayer = ({ autoPlay, children }) => {
    return (<div className={` ${autoPlay ? '' : 'view-hidden'}`}>
        <TransitionGroup>
            <CSSTransition
                timeout={2000}
                in={true}
                appear={true}

                classNames={'slider'}>
                <div className="view">
                    {children}
                </div>
            </CSSTransition></TransitionGroup>
    </div >)
}