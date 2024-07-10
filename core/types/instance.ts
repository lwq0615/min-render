import { Instance } from "@core/instance/Instance"
import { RealDomInstance } from "@core/instance/RealDomInstance"


export type JsxType = string | Component | symbol

export type JsxNode = {
  type: JsxType,
  ref?: string,
  key?: string,
  props?: { [key: string]: any, children?: any}
}

export type Component = (props?: any, that?: This) => any


export enum LIFE {
  create = 0,
  created = 1,
  update = 2,
  mounted = 3
};

export type RealDom = HTMLElement | Text 

export type InstanceType = RealDomInstance | Instance

export type This = {
  refs: { [name: string | string | symbol]: This['expose'] | RealDom }
  useCreated: (fun: Function) => void
  useMounted: (fun: Function) => void
  expose: { [name: string | string | symbol]: any }
  useExpose: (expose: This['expose']) => void
}