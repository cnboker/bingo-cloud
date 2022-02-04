import CSS from 'csstype';
import { Animations } from './constants';
export interface IProps {
  style: CSS.Properties,
}

export type AnimationProps = {
  action: Animations
}


export interface IMeta<T> {
  tag: T,
}

//支持播放完成事件
export type IPlayView<T> = IMeta<T> & {
  urls: string[],
  visible: boolean,
  exit: () => void
}

export type ClockProps<T> = IMeta<T> & {

}

export type ImageProps = {
  src: string
}

export type ImageListProps<T> = IPlayView<T> & {
  urls: string[],
  duration: number,
  animation: string,
}

export type Page<T> = IPlayView<T> & {

}

export type TextProps = {
  text: string
}

export type IVidePlayerProps<T> = IPlayView<T> & {

}

export type IViewProps<T> = {
  playViews: IPlayView<T>[]
}
