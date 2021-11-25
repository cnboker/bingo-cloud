import { UserComponent,useNode } from "@craftjs/core";
import cx from 'classnames'
import React from "react";
import {ImageListSettings} from './ImageListSettings'

type ImageListProps = {
  animation:string,
  duration:number,
  imageUrls:string[],
}

export const ImageList:UserComponent<ImageListProps> =(props:any)=>{
  const {connectors:{connect}} = useNode((node)=>({selected:node.events.selected}))
  const {animation, duration, imageUrls} = props
  return <div></div>
}