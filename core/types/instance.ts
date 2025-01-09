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

export type Component = (props?: any) => any


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

export type Refs = { [name: ObjectKey]: InstanceExpose | HTMLElement }

export const hookKeys = [
  'useMounted',
  'useCreated',
  'useExpose',
  'useNext',
  'useWatch',
  'useRefs',
  'refs',
] as const

type HookTypes = {
  refs: Refs
  useRefs: () => Refs
  useCreated: (fun: Function) => void
  useMounted: (fun: Function) => void
  useExpose: (expose: InstanceExpose) => void
  useNext: (fun: Function) => void
  useWatch: (fun: Watcher['handler'], depends: Watcher['depends']) => void
}
export type This<T extends object = {}> = { [K in (typeof hookKeys)[number]]: HookTypes[K] } & T

export type RenderRoot = (jsxNode: JsxNode, dom: HTMLElement) => void

export type Watcher = {
  depends: unknown[],
  handler: (oldDepends: Watcher['depends'], newDepends: Watcher['depends']) => void
}