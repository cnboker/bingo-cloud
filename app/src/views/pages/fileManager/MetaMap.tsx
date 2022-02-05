export type ElementProps = {
  tag: ElementType
  childrenIds: string[]
}

export type ElementType = 'View' | 'ImageList' | 'Viewport'

export type ViewportProps = ElementProps & {
  tag: 'Viewport'
}

export type ImageListProps = ElementProps & {
  tag: 'ImageList'
  urls: string[]
  duration: number
  animation: 'vanish' | 'buff' | 'drop' | 'rotate' | 'bounce' | 'zoom' | 'slider' | 'opacity'
}

export type MetaMap = {
  rootId: string
  map: Record<string, ImageListProps | ViewportProps>
}
