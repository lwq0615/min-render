import {
  Component,
  This,
  InstanceType,
  JsxNode,
  LIFE,
  RealDom,
  InstanceExpose,
} from "../types/instance";
import { isJsxNode, isObject } from "../utils";
import { appendRealDomByJsxNode } from "../dom";
import {
  getProxy,
} from "../proxy";
import { BaseInstance } from "./BaseInstance";
import { RealDomInstance } from "./RealDomInstance";
import { callInstanceRenderEnd, callInstanceRenderStart } from "./renderDepend";

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
  proxy: Instance;
  setProxy(proxy: Instance) {
    this.proxy = proxy;
  }
  useCreated: This["useCreated"] = function (fun) {
    if (this.life === LIFE.create) {
      fun()
    }
  };
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
      this.jsxNode.props
    );
    callInstanceRenderEnd();
    if (!isJsxNode(childJsxNode)) {
      return String(childJsxNode);
    }
    if (this.life === LIFE.create) {
      this.life = LIFE.created
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
  useRefs: This["useRefs"] = function () {
    return this.refs;
  };
  removeRef(instance: BaseInstance) {
    if (typeof instance.jsxNode !== "string" && instance.jsxNode?.ref) {
      delete this.refs[instance.jsxNode.ref];
    }
  }
  expose: InstanceExpose = {};
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
            this.invokeRenderedTasks()
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
          this.invokeRenderedTasks()
          resolve();
        }
      });
    });
    return this.renderTask;
  }
  renderedTasks: Function[] = []
  useRendered: This["useRendered"] = function (fun: Function) {
    this.renderedTasks.push(fun)
  }
  invokeRenderedTasks() {
    const funs = this.renderedTasks.reverse()
    this.renderedTasks = []
    let fun = null
    while(fun = funs.pop()) {
      fun()
    }
  }
  destroyDom(isTop: boolean) {
    super.destroyDom(isTop)
    this.invokeUnListenHandles()
    this.life = LIFE.destroy
  }
  async reRenderProps(newJsxNode: JsxNode) {
    if (typeof this.jsxNode === "string") {
      return;
    }
    if (this instanceof Instance) {
      this.jsxNode = newJsxNode;
      await this.renderDom();
    }
  }
}
