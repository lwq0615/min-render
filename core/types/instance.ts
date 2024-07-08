import { Instance, RealDomInstance } from "@core/Instance"


export const JSX_TEXT_TYPE = Symbol.for('jsx.text.type')

export type JsxType = string | Component | symbol

export type JsxNode = {
  type: JsxType,
  props?: { [key: string]: any, children?: JsxNode[] | JsxNode }
}

export type Component = (props?: unknown) => Array<JsxNode | string> | JsxNode | string


export enum LIFE {
  create = 0,
  created = 1,
  mounted = 2,
  update = 3
};

export type RealDom = HTMLElement | Text

export type InstanceType = RealDomInstance | Instance