import React from "react";
import { IMeta } from "./Meta";

export type Omit<T, K> = Pick<T, Exclude<keyof T, K>>;
export type Prefer<P, T> = P & Omit<T, keyof P>;
export type ElementPropsWithoutRef<T extends React.ElementType> = Pick<
  React.ComponentPropsWithoutRef<T>,
  keyof React.ComponentPropsWithoutRef<T>
>;
export type OverwritableType<OwnProps, Type extends React.ElementType> = Prefer<
  OwnProps,
  ElementPropsWithoutRef<Type>
>;

export function MetaComponent<T extends React.ElementType = "div">({
  tag,
  ...rest
}: OverwritableType<IMeta<T>, T>) {
  const ElementType: React.ElementType = tag;
 
  return <ElementType {...rest} />
  //return React.createElement(map[ElementType.toString()],rest,children)
}
