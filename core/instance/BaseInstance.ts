import { Instance, Instance$ } from "./Instance";
import { RealDomInstance$ } from "./RealDomInstance";
import { appendRealDomByJsxNode } from "../dom";
import { InstanceType, JsxNode, RealDom } from "../types/instance";
import { isFragmentJsxNode, isJsxNode } from "../utils";

// html标签 & 自定义组件 虚拟dom公用api
export class BaseInstance {
  constructor(
    jsxNode: JsxNode | string,
    parentDom: RealDom,
    parentInstance: Instance,
    instance: InstanceType
  ) {
    this.jsxNode = jsxNode;
    this.parentDom = parentDom;
    this.parentInstance = parentInstance;
    this.instance = instance;
    if (typeof jsxNode !== "string") {
      this.key = jsxNode.key;
    }
  }
  key: string;
  // 节点实例
  instance: InstanceType;
  // 节点jsx
  jsxNode: JsxNode | string;
  // 渲染的父dom
  parentDom: RealDom;
  // 父组件实例（自定义组件）
  parentInstance: Instance;
  // 子节点列表
  childrens: Array<InstanceType> = [];
  // 判断节点是否可以复用
  sameTypeAndKey(jsxNode: JsxNode | string) {
    if (!isJsxNode(jsxNode) && !isJsxNode(this.jsxNode)) {
      return this.jsxNode === jsxNode;
    } else if (
      isJsxNode(jsxNode) &&
      typeof jsxNode !== "string" &&
      isJsxNode(this.jsxNode) &&
      typeof this.jsxNode !== "string"
    ) {
      return (
        jsxNode.type === this.jsxNode.type &&
        this.key === jsxNode.key &&
        jsxNode.ref === this.jsxNode.ref
      );
    } else {
      return false;
    }
  }
  // 获取相对新的jsxNode需要改变的props
  getDiffObj(newJsxNode: JsxNode) {
    function getProps(jsxNode: JsxNode) {
      const props: { [name: string]: any } = {};
      Object.keys(jsxNode.props).map((key) => {
        if (key !== "children") {
          props[key] = jsxNode.props[key];
        }
      });
      return props;
    }
    const oldProps = getProps(this.jsxNode as JsxNode);
    const newProps = getProps(newJsxNode);
    const keys = new Set(Object.keys(oldProps).concat(Object.keys(newProps)))
    const changeProps: { [name: string]: any } = {}
    for (const key of keys) {
      if (newProps[key] !== oldProps[key]) {
        changeProps[key] = newProps[key]
      }
    }
    return changeProps
  }
  // 判断是否全等
  equals(jsxNode: JsxNode | string) {
    if (!this.sameTypeAndKey(jsxNode)) {
      return false;
    }
    jsxNode = jsxNode as JsxNode;
    return JSON.stringify(jsxNode) === JSON.stringify(this.jsxNode);
  }
  // 获取当前元素dom列表
  getRealDoms(): RealDom[] {
    if (this instanceof RealDomInstance$) {
      return [this.dom];
    } else {
      return this.getRealChildDoms();
    }
  }
  // 获取当前元素的子节点Dom列表
  getRealChildDoms(): Array<RealDom> {
    const realDoms: RealDom[] = [];
    this.childrens.map((instance) => {
      if (instance instanceof Instance) {
        for (const dom of instance.$.getRealChildDoms()) {
          realDoms.push(dom);
        }
      } else {
        realDoms.push(instance.$.dom);
      }
    });
    return realDoms;
  }
  // 销毁
  destroyDom(isTop: boolean) {
    this.parentInstance.$.removeRef(this.instance);
    if (this instanceof RealDomInstance$ && isTop) {
      this.dom.remove();
      isTop = false;
    }
    for (const instance of this.childrens) {
      instance.$.destroyDom(isTop);
    }
    this.childrens = [];
  }
  // prop发生改变，重新渲染当前实例
  async reRenderProps(newJsxNode: JsxNode) {
    if (typeof this.jsxNode === "string") {
      return;
    }
    if (this instanceof Instance$) {
      this.jsxNode = newJsxNode;
      await this.renderDom();
    } else if (this instanceof RealDomInstance$) {
      const diffProps = this.getDiffObj(newJsxNode)
      if (!Object.keys(diffProps).length) {
        this.jsxNode = newJsxNode;
      } else {
        // 重新设置变化的属性
        this.jsxNode = newJsxNode;
        this.setProps(diffProps)
      }
      await this.reRenderChildren(newJsxNode.props.children);
    }
  }
  // 重新渲染子元素
  async reRenderChildren(
    newJsxNodes: any
  ): Promise<void> {
    function fragmentJsxNodeTran(arr: any): Array<JsxNode | string> {
      const res = [];
      if (!Array.isArray(arr)) {
        arr = [arr];
      }
      for (const item of arr) {
        if (isFragmentJsxNode(item)) {
          res.push(...fragmentJsxNodeTran((item as JsxNode).props.children));
        } else if (Array.isArray(item)) {
          res.push(...fragmentJsxNodeTran(item));
        } else {
          res.push(item);
        }
      }
      return res;
    }
    newJsxNodes = fragmentJsxNodeTran(newJsxNodes);
    let parentDom = this.parentDom;
    if (this instanceof RealDomInstance$) {
      parentDom = (this as unknown as RealDomInstance$).dom;
    }
    let offset = 0;
    if (this instanceof Instance$) {
      offset += [...parentDom.childNodes].indexOf(this.getRealDoms()[0]);
    }
    const children: InstanceType[] = [];
    // 准备新的节点
    for (const jsxNode of newJsxNodes) {
      // 有可重复使用的相同标签&&key节点
      const index: number = this.childrens.findIndex((instance) => {
        return instance.$.sameTypeAndKey(jsxNode);
      });
      if (index !== -1) {
        const sameNode: InstanceType = this.childrens.splice(index, 1)[0];
        // 该节点属性发生了改变，重新渲染
        if (!sameNode.$.equals(jsxNode)) {
          await sameNode.$.reRenderProps(jsxNode as JsxNode);
        }
        children.push(sameNode);
      } else {
        children.push(
          ...(await appendRealDomByJsxNode(
            jsxNode,
            parentDom,
            this instanceof Instance ? this : this.parentInstance
          ))
        );
      }
    }
    // 卸载不需要的组件
    for (const item of this.childrens) {
      item.$.destroyDom(true);
    }
    const doms = children
      .map((item) => item.$.getRealDoms())
      .reduce((pre, cur) => pre.concat(cur), []);
    // 开始diff，卸载不可复用的节点
    // 排列插入新的节点
    doms.forEach((dom, i) => {
      // 不存在该元素
      if ([...parentDom.childNodes].indexOf(dom) === -1) {
        parentDom.insertBefore(dom, parentDom.childNodes[i + offset]);
      }
      // 存在但是位置不对
      else if ([...parentDom.childNodes].indexOf(dom) != i + offset) {
        parentDom.insertBefore(dom, parentDom.childNodes[i + offset]);
      }
    });
    this.childrens = children;
  }
}