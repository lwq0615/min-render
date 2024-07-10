import {
  createInstance,
  createRealDomInstance,
  Instance,
  RealDomInstance,
} from "@core/Instance";
import { InstanceType, JsxNode, RealDom } from "@core/types/instance";
import {
  getListenerName,
  isComponent,
  isFragmentJsxNode,
  isJsxNode,
  isListener,
} from "./utils";

/**
 * 渲染jsx节点内容到真实dom
 * @param jsxNode jsx节点
 * @param parentDom 真实dom
 * @param instance 节点所在的组件实例
 */
export async function appendRealDomByJsxNode(
  jsxNode: JsxNode | string | Array<JsxNode | string>,
  parentDom: RealDom,
  instance: Instance
): Promise<Array<InstanceType>> {
  if(Array.isArray(jsxNode)) {
    const children = []
    for (const item of jsxNode) {
       children.push(...(await appendRealDomByJsxNode(item, parentDom, instance)))
    }
    return children
  }
  else if (typeof jsxNode === "string" || !isJsxNode(jsxNode)) {
    // 返回的不是jsx
    if((jsxNode as unknown as number) !== 0 && !Boolean(jsxNode)) {
      return []
    }
    return [await createRealDomInstance(jsxNode, parentDom, instance)];
  }
  // 返回jsx是多节点
  else if (isFragmentJsxNode(jsxNode)) {
    if (Array.isArray(jsxNode.props.children)) {
      let childrens: Array<InstanceType> = [];
      for (const childJsxNode of jsxNode.props.children) {
        childrens = childrens.concat(
          await appendRealDomByJsxNode(childJsxNode, parentDom, instance)
        );
      }
      return childrens;
    } else {
      return await appendRealDomByJsxNode(
        jsxNode.props.children,
        parentDom,
        instance
      );
    }
  } else {
    // 自定义组件
    if (isComponent(jsxNode)) {
      return [await createInstance(jsxNode, parentDom, instance)];
    } else {
      return [await createRealDomInstance(jsxNode, parentDom, instance)];
    }
  }
}