import { Instance } from "../instance/Instance"
import { RealDomInstance } from "../instance/RealDomInstance"
import { ObjectKey } from "./object"


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
  mounted = 3,
  destroy = 4
};

export type RealDom = HTMLElement | Text 

export type InstanceType = RealDomInstance | Instance

export type InstanceExpose = { [name: ObjectKey]: any }

export type This = {
  refs: { [name: ObjectKey]: InstanceExpose | HTMLElement }
  useRefs: () => This["refs"]
  useCreated: (fun: Function) => void
  useMounted: (fun: Function) => void
  useExpose: (expose: InstanceExpose) => void
}

export type RenderRoot = (jsxNode: JsxNode, dom: HTMLElement) => void