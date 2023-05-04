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
    return sources.map(x => {
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
        }
    })
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


// export const transformData = (data: PostData): MetaMap => {
//     //终端需要本地播放，删除域名，默认http://localhost/path
//     data.urls = data.urls.map(item => {
//         return (new URL(item)).pathname
//     })

//     let newId = uniqueID()
//     const metaMap = createRootEntity();
//     const root = metaMap.map[metaMap.rootId]
//     const imageList = createImageListEntity(data)
//     const videoList = createVideoPlayerEntity(data)
//     //check first url type
//     const firstUrl = data.urls[0]
//     if (firstUrl.substring(firstUrl.lastIndexOf('.') + 1) === 'mp4') {
//         metaMap.map[newId] = videoList
//         root.childrenIds.push(newId)
//         if (imageList.urls.length > 0) {
//             newId = uniqueID()
//             metaMap.map[newId] = imageList
//             root.childrenIds.push(newId)
//         }

//     } else {
//         metaMap.map[newId] = imageList
//         root.childrenIds.push(newId)

//         if (videoList.playlist.length > 0) {
//             newId = uniqueID()
//             metaMap.map[newId] = videoList
//             root.childrenIds.push(newId)
//         }
//     }
//     //如果只包含image或video，则增加重复项目解决循环播放报错问题
//     if (root.childrenIds.length === 1) {
//         root.childrenIds.push(root.childrenIds[0])
//     }
//     return metaMap
// }

const createRootEntity = (): MetaMap => {
    const rootId = uniqueID()
    const metaMap: MetaMap = {
        rootId,
        map: {},
    }
    metaMap.map[rootId] = {
        tag: 'Viewport',
        childrenIds: [],
    }
    return metaMap
}
const createPlaylistEntity = (list: PostData): Array<IPlayProps> => {
    list
    return null
}

// const createImageListEntity = (data: PostData): ImageListProps => {
//     const { urls, duration, animation } = data
//     const _urls = urls.filter(x => {
//         const ext = x.substring(x.lastIndexOf('.') + 1)
//         return ext === 'jpg' || ext === 'jpeg' || ext === 'png'
//     })
//     const _animation = animation as Animation
//     return {
//         tag: 'ImageList',
//         urls: _urls,
//         duration,
//         animation: _animation,
//         childrenIds: [],
//     }
// }

// const createVideoPlayerEntity = (data: PostData): VideoListProps => {
//     const { urls, duration, animation } = data
//     const _urls = urls.filter(x => {
//         const ext = x.substring(x.lastIndexOf('.') + 1)
//         return ext === 'mp4' || ext === 'webm'
//     })
//     return <VideoListProps>{
//         tag: 'VideoPlayer',
//         playlist: createPlaylist(_urls),
//         urls: _urls,
//         childrenIds: [],
//     }
// }

type PlaySource = {
    sources: PlaySourceItem[],
    poster: string
}

type PlaySourceItem = {
    src: string,
    type: string
}

const createPlaylist = (urls: string[]): PlaySource[] => {
    return urls.map(src => {
        return <PlaySource>{
            sources: [<PlaySourceItem>{
                src,
                type: 'video/' + src.substring(src.lastIndexOf('.') + 1)
            }],
            poster: ''
        }
    })
}
