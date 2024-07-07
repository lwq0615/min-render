import { JsxNode } from "@core/types/instance";


const REACT_ELEMENT_TYPE = Symbol.for("react.element");
const REACT_FRAGMENT_TYPE = Symbol.for("react.fragment");
export function isListener(name: string): boolean {
  const strCode = name?.charCodeAt(2);
  return Boolean(name) && name.startsWith("on") && strCode >= 65 && strCode <= 90;
}

export function getListenerName(name: string): string {
  return `on${name.charAt(2).toLocaleLowerCase()}${name.substring(3)}`;
}

export function isJsxNode(obj: any) {
  return typeof obj === 'object' && obj.$$typeof === REACT_ELEMENT_TYPE
}

// 是多节点的jsx
export function isFragmentJsxNode(obj: JsxNode) {
  return obj.type === REACT_FRAGMENT_TYPE
}

export function isComponent(obj: JsxNode) {
  return typeof obj.type  !== 'string' && typeof obj.type !== 'symbol'
}