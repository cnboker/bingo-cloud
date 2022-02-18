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

export type IPlayProps = {
  type: 'image' | 'video' | 'page'
  animation: string;
  exit: () => void;
}

export type IImageProps = IPlayProps & {
  url: string,
  duration: number,
}

export type IVideoProps = IPlayProps & {
  url: string,
  poster:string
}

export type IPageProps = IPlayProps & {
  pageName: string
}



export type ClockProps<T> = IMeta<T> & {

}

export type ImageProps = {
  src: string
}

export type TextProps = {
  text: string
}
