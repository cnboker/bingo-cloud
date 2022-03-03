import CSS from 'csstype';
import React from 'react';
import { Animations } from './constants';
export interface IProps {
  style: CSS.Properties,
}

export interface IMeta<T> {
  tag: T,
}


export type IPlayProps = {
  type: 'image' | 'video' | 'page'
  exit: () => void
  animation: string
  autoPlay?: boolean
  visible?: boolean
  children?: React.ReactNode
  label?:string
}

export type IImageProps = IPlayProps & {
  url: string,
  duration: number,
}

export type IVideoProps = IPlayProps & {
  url: string,
  poster: string
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
