import CSS from 'csstype';

export interface IProps  {
  style: CSS.Properties,
}

export interface IMeta<T> {
  tag: T,
} 

type AnimationAction = 'bounce' | 'flash' | 'pulse'

export type AnimationProps =  {
  action: AnimationAction
}

export type View<T> = IMeta<T> & {

}

export type ClockProps<T> = IMeta<T> & {

}

export type ImageProps =  {
  src: string
}

export type ImagePlayerProps = {
  duration: number
}

export type TextProps<T> = IMeta<T> & {
  text: string
}

export type VideProps<T> = IMeta<T> & {

}

export type ViewProps=  {
  duration:number
}

export type FragementProps =  {

}