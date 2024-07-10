import { JsxNode } from "../types/instance";


const REACT_ELEMENT_TYPE = Symbol.for("react.element");
const REACT_FRAGMENT_TYPE = Symbol.for("react.fragment");


/**
 * 判断该属性是否是方法监听
 * @param name 属性名
 */
export function isListener(name: string): boolean {
  const strCode = name?.charCodeAt(2);
  return Boolean(name) && name.startsWith("on") && strCode >= 65 && strCode <= 90;
}

/**
 * 转换为on开头的事件名
 * @param name 
 * @returns 
 */
export function getListenerName(name: string): string {
  return `on${name.charAt(2).toLocaleLowerCase()}${name.substring(3)}`;
}

// 判断是否为jsx节点
export function isJsxNode(obj: any) {
  return typeof obj === 'object' && obj.$$typeof === REACT_ELEMENT_TYPE
}

// 判断是否多节点的jsx
export function isFragmentJsxNode(obj: JsxNode | string) {
  return isJsxNode(obj) && typeof obj !== 'string' && obj.type === REACT_FRAGMENT_TYPE
}

// 判断是否是一个jsx组件节点
export function isComponent(obj: JsxNode) {
  return typeof obj.type  !== 'string' && typeof obj.type !== 'symbol'
}
