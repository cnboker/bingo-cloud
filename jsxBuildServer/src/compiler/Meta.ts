import CSS from 'csstype';
import { Animations } from './constants';
export interface IProps  {
  style: CSS.Properties,
}

export interface IMeta<T> {
  tag: T, 
} 

export type AnimationProps =  {
  action: Animations
}

export type View<T> = IMeta<T> & {

}

export type ClockProps<T> = IMeta<T> & {

}

export type ImageProps =  {
  src: string
}

export type ImageListProps = {
  urls:string[],
  duration: number,
  animation:string,
  exit:()=>void
}

export type TextProps =  {
  text: string
}

export type VideProps<T> = IMeta<T> & {

}

export type ViewProps=  {
  duration:number
}

export type FragementProps =  {

}