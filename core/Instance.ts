import {
  Component,
  InstanceThis,
  InstanceType,
  JSX_TEXT_TYPE,
  JsxNode,
  LIFE,
  RealDom,
} from "./types/instance";
import {
  getListenerName,
  isFragmentJsxNode,
  isJsxNode,
  isListener,
} from "./utils";
import { appendRealDomByJsxNode } from "./dom";
import { getProxy } from "./proxy";

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
    instance.$.setProxy(proxy);
    instance.$.render();
    instance.$.invokeCreatedLifeHandles();
    instance.$.renderDom().then(() => {
      instance.$.invokeMountedLifeHandles();
      resolve(instance);
    });
  });
}

export function createRealDomInstance(
  jsxNode: JsxNode | string,
  parentDom: RealDom,
  parentInstance: Instance
): Promise<RealDomInstance> {
  return new Promise(async (resolve) => {
    const instance = new RealDomInstance(parentDom, jsxNode, parentInstance);
    return instance.$.renderDom().then(() => {
      resolve(instance);
    });
  });
}

// html标签 & 自定义组件 虚拟dom公用api
class BaseInstance {
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
  instance: InstanceType;
  jsxNode: JsxNode | string;
  parentDom: RealDom;
  // 父组件实例（自定义组件）
  parentInstance: Instance;
  childrens: Array<InstanceType> = [];
  getJsxType(jsxNode: JsxNode | string) {
    return isJsxNode(jsxNode) ? (jsxNode as JsxNode).type : JSX_TEXT_TYPE;
  }
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
        this.getJsxType(jsxNode) === this.getJsxType(this.jsxNode) &&
        this.key === jsxNode.key
      );
    } else {
      return false;
    }
  }
  sameProps(jsxNode: JsxNode) {
    const props: { [name: string]: any } = {};
    Object.keys(jsxNode.props).map((key) => {
      if (key !== "children") {
        props[key] = jsxNode.props[key];
      }
    });
    function getDiffObj(jsxNode: JsxNode) {
      return JSON.stringify({
        props,
        ref: jsxNode.ref,
      });
    }
    return getDiffObj(jsxNode) === getDiffObj(this.jsxNode as JsxNode);
  }
  equals(jsxNode: JsxNode | string) {
    if (!this.sameTypeAndKey(jsxNode)) {
      return false;
    }
    jsxNode = jsxNode as JsxNode;
    return JSON.stringify(jsxNode) === JSON.stringify(this.jsxNode);
  }
  getRealDoms(): RealDom[] {
    if (this instanceof RealDomInstance$) {
      return [this.dom];
    } else {
      return this.getRealChildDoms();
    }
  }
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
  renderTask: Promise<void>;
  destroyDom() {
    if (this instanceof Instance$) {
      for (const instance of this.childrens) {
        instance.$.destroyDom();
        this.parentInstance.$.removeRef(this.instance);
      }
    } else if (this instanceof RealDomInstance$) {
      this.dom.remove();
    }
    this.childrens = [];
  }
  async reRenderProps(newJsxNode: JsxNode) {
    if (typeof this.jsxNode === "string") {
      return;
    }
    this.jsxNode = newJsxNode;
    if (this instanceof Instance$) {
      await this.renderDom();
    } else if (this instanceof RealDomInstance$) {
      if (this.sameProps(newJsxNode)) {
        await this.reRenderChildren(newJsxNode.props.children);
      } else {
        // TODO 重新设置变化的属性
      }
    }
  }
  async reRenderChildren(
    newJsxNodes: Array<JsxNode | string> | JsxNode | string
  ): Promise<void> {
    function fragmentJsxNodeTran(
      arr: Array<JsxNode | string> | JsxNode | string
    ): Array<JsxNode | string> {
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
    let offset = 0
    if(this instanceof Instance$) {
      offset += [...parentDom.childNodes].indexOf(this.getRealDoms()[0])
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
      item.$.destroyDom();
    }
    const doms = children
      .map((item) => item.$.getRealDoms())
      .reduce((pre, cur) => pre.concat(cur), []);
    // 开始diff，卸载不可复用的节点
    // 排列插入新的节点
    doms.forEach((dom, i) => {
      // 不存在该元素
      if ([...parentDom.childNodes].indexOf(dom) === -1) {
        parentDom.insertBefore(dom, parentDom.childNodes[i+offset]);
      }
      // 存在但是位置不对
      else if ([...parentDom.childNodes].indexOf(dom) != i+offset) {
        parentDom.insertBefore(dom, parentDom.childNodes[i+offset]);
      }
    });
    this.childrens = children;
  }
}

// html标签虚拟dom
export class RealDomInstance {
  constructor(
    parentDom: RealDom,
    jsxNode: JsxNode | string,
    parentInstance: Instance
  ) {
    this.$ = new RealDomInstance$(parentDom, jsxNode, parentInstance, this);
  }
  $: RealDomInstance$;
}

class RealDomInstance$ extends BaseInstance {
  constructor(
    parentDom: RealDom,
    jsxNode: JsxNode | string,
    parentInstance: Instance,
    instance: RealDomInstance
  ) {
    super(jsxNode, parentDom, parentInstance, instance);
  }
  dom: RealDom;
  async renderDom(): Promise<void> {
    const isTop = this.parentInstance.$.parentDom === this.parentDom;
    if (!isJsxNode(this.jsxNode)) {
      const node = document.createTextNode(String(this.jsxNode));
      if (!isTop) {
        this.parentDom.appendChild(node);
      }
      this.dom = node;
    } else {
      this.jsxNode = this.jsxNode as JsxNode;
      // 原生html标签
      const realDom = document.createElement(this.jsxNode.type as string);
      for (const prop in this.jsxNode.props) {
        const contProps = ["children"];
        if (contProps.includes(prop)) {
          continue;
        }
        const value = this.jsxNode.props[prop];
        if (isListener(prop)) {
          (realDom as any)[getListenerName(prop)] = value;
        } else {
          realDom.setAttribute(prop, value);
        }
      }
      // 递归渲染子节点
      let childrens: Array<InstanceType> = [];
      if (this.jsxNode.props.children !== void 0) {
        if (Array.isArray(this.jsxNode.props.children)) {
          for (const child of this.jsxNode.props.children) {
            childrens = childrens.concat(
              await appendRealDomByJsxNode(child, realDom, this.parentInstance)
            );
          }
        } else {
          childrens = childrens.concat(
            await appendRealDomByJsxNode(
              this.jsxNode.props.children,
              realDom,
              this.parentInstance
            )
          );
        }
      }
      if (!isTop) {
        this.parentDom.appendChild(realDom);
      }
      this.dom = realDom;
      this.childrens = childrens;
      this.parentInstance.$.setRef(this.instance);
    }
  }
}

// 自定义组件虚拟dom
export class Instance {
  constructor(parentDom: RealDom, jsxNode: JsxNode, parentInstance?: Instance) {
    this.$ = new Instance$(parentDom, jsxNode, this, parentInstance);
  }
  [name: string | symbol]: unknown;
  $: Instance$;
}

export class Instance$ extends BaseInstance {
  constructor(
    parentDom: RealDom,
    jsxNode: JsxNode,
    instance: Instance,
    parentInstance?: Instance
  ) {
    super(jsxNode, parentDom, parentInstance, instance);
  }
  life: LIFE = LIFE.create;
  createdLifeHandles: Function[] = [];
  proxy: Instance;
  setProxy(proxy: Instance) {
    this.proxy = proxy;
  }
  useCreated: InstanceThis["useCreated"] = function (fun: Function) {
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
  useMounted: InstanceThis["useMounted"] = function (fun: Function) {
    if (this.life === LIFE.create) {
      this.mountedLifeHandles.push(fun);
    }
  };
  invokeMountedLifeHandles(): void {
    this.mountedLifeHandles.forEach((fun) => {
      fun();
    });
  }
  render: Component = function () {
    const childJsxNode = (this.jsxNode.type as Component).call(
      this.proxy,
      this.jsxNode.props,
      this.proxy
    );
    if (!isJsxNode(childJsxNode)) {
      return String(childJsxNode);
    }
    return childJsxNode;
  };
  refs: InstanceThis["refs"] = {};
  setRef(instance: InstanceType) {
    if (typeof instance.$.jsxNode !== "string" && instance.$.jsxNode?.ref) {
      if (this.refs[instance.$.jsxNode.ref]) {
        throw new Error(`ref ${instance.$.jsxNode.ref} is already exists`);
      }
      if (instance instanceof Instance) {
        this.refs[instance.$.jsxNode.ref] = instance.$.expose;
      } else if (instance instanceof RealDomInstance) {
        this.refs[instance.$.jsxNode.ref] = instance.$.dom;
      }
    }
  }
  expose: InstanceThis["expose"] = {};
  useExpose: InstanceThis["useExpose"] = function (expose) {
    if (Object.prototype.toString.call(expose) !== "[object Object]") {
      throw new Error("expose must be object");
    }
    Object.keys(this.expose).forEach((key) => delete this.expose[key]);
    Object.keys(expose).forEach((key) => (this.expose[key] = expose[key]));
  };
  removeRef(instance: InstanceType) {
    if (typeof instance.$.jsxNode !== "string" && instance.$.jsxNode?.ref) {
      delete this.refs[instance.$.jsxNode.ref];
    }
  }
  appendDomToParentDom() {
    for (const dom of this.getRealDoms()) {
      this.parentDom.appendChild(dom);
    }
  }
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
            this.instance as Instance
          );
          // 第一次渲染的时候直接插入dom树
          if (this.life <= LIFE.created) {
            this.appendDomToParentDom();
          }
          this.life = LIFE.mounted;
          this.renderTask = null;
          this.parentInstance?.$.setRef(this.instance);
          resolve();
        }
      });
    });
    return this.renderTask;
  }
}
