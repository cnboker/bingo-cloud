export type ElementProps = {
    tag: ElementType,
    childrenIds: string[],
}

export type ElementType = 'View' | 'ImageList'
export type ViewProps = ElementProps & {
    tag: 'View'
}

export type ImageListProps = ElementProps & {
    tag: 'ImageList',
    urls: string[],
    duration: number,
    animation: 'vanish' | 'buff' | 'drop' | 'rotate' | 'bounce' | 'zoom' | 'slider' | 'opacity'
}

export type MetaMap = {
    rootId: string,
    map: Record<string, ImageListProps | ViewProps>,
}