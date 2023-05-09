import { IImageProps, IPageProps, IPlayProps, IVideoProps } from "../compiler/Meta"

export type sourceProps = {
    type: 'image' | 'video' | 'page',
    url: string,
    name: string,
    poster: string
}

export type PostData = {
    sources: sourceProps[],
    duration: number,
    animation: string
}

export const transformData = (data: PostData): IPlayProps[] => {
    const { duration, animation, sources } = data
    const result = sources.map(x => {
        if (x.type === 'image') {
            return <IImageProps>{
                type: 'image',
                animation,
                duration,
                url: '.' + (new URL(x.url)).pathname,

            }
        } else if (x.type === 'video') {
            return <IVideoProps>{
                type: 'video',
                url: '.' + (new URL(x.url)).pathname,
                poster: x.poster.indexOf('http:') !== -1 ? '.' + (new URL(x.poster)).pathname : x.poster,

            }
        } else if (x.type === 'page') {
            return <IPageProps>{
                type: 'page',
                pageName: '',

            }
        }else{
            return null;
        }
    })
    console.log('result',result)
    return result;
}

export type ElementType = 'ImageList' | 'Viewport' | 'VideoJS' | 'VideoPlayer'

export type ElementProps = {
    tag: ElementType
    childrenIds: string[]
}

export type ViewportProps = ElementProps & {
    tag: 'Viewport'
}

type Animation = 'vanish' | 'buff' | 'drop' | 'rotate' | 'bounce' | 'zoom' | 'slider' | 'opacity'
export type ImageListProps = ElementProps & {
    tag: 'ImageList'
    urls: string[]
    duration: number
    animation: Animation
}

export type VideoListProps = ElementProps & {
    tag: 'VideoPlayer',
    playlist: PlaySource[],
    //视频链接
    urls: string[],
    childrenIds: []
}


export type MetaMap = {
    rootId: string
    map: Record<string, ImageListProps | ViewportProps | VideoListProps | IPlayProps>
}

export const uniqueID = () => {
    return Math.random().toString(36).slice(2)
}

type PlaySource = {
    sources: PlaySourceItem[],
    poster: string
}

type PlaySourceItem = {
    src: string,
    type: string
}

