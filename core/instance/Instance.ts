import {
  Component,
  This,
  InstanceType,
  JsxNode,
  LIFE,
  RealDom,
} from "../types/instance";
import { isJsxNode, isObject } from "../utils";
import { appendRealDomByJsxNode } from "../dom";
import {
  callInstanceRenderEnd,
  callInstanceRenderStart,
  getProxy,
} from "../proxy";
import { BaseInstance } from "./BaseInstance";
import { RealDomInstance } from "./RealDomInstance";

/**
 * 创建组件实例
 * @param jsxNode 组件jsx节点
 * @param parentDom 组件渲染的真实父dom
 * @param parentInstance 组件的父实例
 */
export function createInstance(
  jsxNode: JsxNode,
  parentDom: RealDom,
  parentInstance?: Instance
): Promise<Instance> {
  return new Promise((resolve) => {
    const instance = new Instance(parentDom, jsxNode, parentInstance);
    const proxy = getProxy(instance);
    instance.setProxy(proxy);
    instance.render();
    instance.invokeCreatedLifeHandles();
    instance.renderDom().then(() => {
      instance.invokeMountedLifeHandles();
      resolve(instance);
    });
  });
}

// 自定义组件虚拟dom
export class Instance extends BaseInstance {
  constructor(parentDom: RealDom, jsxNode: JsxNode, parentInstance?: Instance) {
    super(jsxNode, parentDom, parentInstance);
  }
  life: LIFE = LIFE.create;
  createdLifeHandles: Function[] = [];
  proxy: Instance;
  setProxy(proxy: Instance) {
    this.proxy = proxy;
  }
  useCreated: This["useCreated"] = function (fun) {
    if (this.life === LIFE.create) {
      this.createdLifeHandles.push(fun);
    }
  };
  invokeCreatedLifeHandles(): void {
    this.createdLifeHandles.forEach((fun) => {
      fun();
    });
    this.life = LIFE.created;
  }
  mountedLifeHandles: Function[] = [];
  useMounted: This["useMounted"] = function (fun) {
    if (this.life === LIFE.create) {
      this.mountedLifeHandles.push(fun);
    }
  };
  invokeMountedLifeHandles(): void {
    this.mountedLifeHandles.forEach((fun) => {
      fun();
    });
  }
  unListenHandles: Function[] = [];
  // 增加一个取消监听响应式数据的函数，用于取消监听
  pushUnListenHandler(handle: Function) {
    this.unListenHandles.push(handle);
  }
  // 取消与实例相关的响应式监听
  invokeUnListenHandles(): void {
    let handle = null;
    while ((handle = this.unListenHandles.pop())) {
      handle?.();
    }
  }
  render: Component = function () {
    this.invokeUnListenHandles();
    callInstanceRenderStart(this);
    const childJsxNode = (this.jsxNode.type as Component).call(
      this.proxy,
      this.jsxNode.props,
      this.proxy
    );
    callInstanceRenderEnd();
    if (!isJsxNode(childJsxNode)) {
      return String(childJsxNode);
    }
    return childJsxNode;
  };
  refs: This["refs"] = {};
  setRef(instance: InstanceType) {
    if (typeof instance.jsxNode !== "string" && instance.jsxNode?.ref) {
      if (this.refs[instance.jsxNode.ref]) {
        throw new Error(`ref ${instance.jsxNode.ref} is already exists`);
      }
      if (instance instanceof Instance) {
        this.refs[instance.jsxNode.ref] = instance.expose;
      } else if (instance instanceof RealDomInstance) {
        this.refs[instance.jsxNode.ref] = instance.dom;
      }
    }
  }
  removeRef(instance: BaseInstance) {
    if (typeof instance.jsxNode !== "string" && instance.jsxNode?.ref) {
      delete this.refs[instance.jsxNode.ref];
    }
  }
  expose: This["expose"] = {};
  useExpose: This["useExpose"] = function (expose) {
    if (!isObject(expose)) {
      throw new Error("expose must be object");
    }
    Object.keys(this.expose).forEach((key) => delete this.expose[key]);
    Object.keys(expose).forEach((key) => (this.expose[key] = expose[key]));
  };
  appendDomToParentDom() {
    for (const dom of this.getRealDoms()) {
      this.parentDom.appendChild(dom);
    }
  }
  renderTask: Promise<void>;
  renderDom(): Promise<void> {
    if (this.renderTask) {
      return;
    }
    this.renderTask = new Promise<void>((resolve) => {
      Promise.resolve().then(async () => {
        if (!this.render) {
          return;
        }
        const childJsxNode = this.render();
        if (this.life >= LIFE.mounted) {
          this.life = LIFE.update;
          this.reRenderChildren(childJsxNode).then(() => {
            this.life = LIFE.mounted;
            this.renderTask = null;
            resolve();
          });
        } else {
          this.childrens = await appendRealDomByJsxNode(
            childJsxNode,
            this.parentDom,
            this
          );
          // 第一次渲染的时候直接插入dom树
          if (this.life <= LIFE.created) {
            this.appendDomToParentDom();
          }
          this.life = LIFE.mounted;
          this.renderTask = null;
          this.parentInstance?.setRef(this);
          resolve();
        }
      });
    });
    return this.renderTask;
  }
}
