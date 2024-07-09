import {
  Component,
  InstanceType,
  JSX_TEXT_TYPE,
  JsxNode,
  LIFE,
  RealDom,
} from "./types/instance";
import { getListenerName, isJsxNode, isListener } from "./utils";
import { appendRealDomByJsxNode } from "./utils/dom";

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
    instance.$.setRender(jsxNode, proxy);
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
  parentInstance?: Instance
): Promise<RealDomInstance> {
  return new Promise(async (resolve) => {
    const instance = new RealDomInstance(parentDom, jsxNode, parentInstance);
    if (!isJsxNode(jsxNode)) {
      const node = document.createTextNode(String(jsxNode));
      parentDom.appendChild(node);
      instance.$.dom = node;
      resolve(instance);
    } else {
      jsxNode = jsxNode as JsxNode;
      // 原生html标签
      const realDom = document.createElement(jsxNode.type as string);
      for (const prop in jsxNode.props) {
        const contProps = ["children"];
        if (contProps.includes(prop)) {
          continue;
        }
        const value = jsxNode.props[prop];
        if (isListener(prop)) {
          (realDom as any)[getListenerName(prop)] = value;
        } else {
          realDom.setAttribute(prop, value);
        }
      }
      // 递归渲染子节点
      let childrens: Array<InstanceType> = [];
      if (jsxNode.props.children !== void 0) {
        if (Array.isArray(jsxNode.props.children)) {
          for (const child of jsxNode.props.children) {
            childrens = childrens.concat(
              await appendRealDomByJsxNode(child, realDom, parentInstance)
            );
          }
        } else {
          childrens = childrens.concat(
            await appendRealDomByJsxNode(
              jsxNode.props.children,
              realDom,
              parentInstance
            )
          );
        }
      }
      parentDom.appendChild(realDom);
      instance.$.dom = realDom;
      instance.$.childrens = childrens;
      resolve(instance);
    }
  });
}

// html标签 & 自定义组件 虚拟dom公用api
class BaseInstance {
  constructor(
    jsxNode: JsxNode | string,
    parentDom: RealDom,
    parentInstance: Instance
  ) {
    this.jsxNode = jsxNode;
    this.parentDom = parentDom;
    this.parentInstance = parentInstance;
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
    if (typeof jsxNode === "string" && typeof this.jsxNode === "string") {
      return this.jsxNode === this.jsxNode;
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
    for (const instance of this.childrens) {
      if (instance instanceof Instance) {
        instance.$.destroyDom();
      } else {
        instance.$.dom.remove();
      }
    }
    this.childrens = [];
  }
  async reRenderProps(newJsxNode: JsxNode) {
    if (typeof this.jsxNode === "string") {
      return;
    }
    this.jsxNode = newJsxNode;
    if (this instanceof Instance$) {
      this.setRender(newJsxNode, this.proxy);
      await this.renderDom();
    } else if (this instanceof RealDomInstance$) {
      if (this.sameProps(newJsxNode)) {
        this.reRenderChildren(newJsxNode.props.children);
        this.parentDom.appendChild(this.dom);
      } else {
        // TODO
      }
    }
  }
  async reRenderChildren(
    newJsxNodes: Array<JsxNode | string> | JsxNode | string
  ): Promise<void> {
    const children: InstanceType[] = [];
    if (!Array.isArray(newJsxNodes)) {
      newJsxNodes = [newJsxNodes];
    }
    for (const dom of this.getRealChildDoms()) {
      dom.remove();
    }
    let parentDom = this.parentDom;
    if (this instanceof RealDomInstance$) {
      parentDom = (this as unknown as RealDomInstance$).dom;
    }
    for (const jsxNode of newJsxNodes) {
      // 有可重复使用的相同标签&&key节点
      const sameNode: InstanceType = this.childrens.find((instance) => {
        return instance.$.sameTypeAndKey(jsxNode);
      });
      if (sameNode) {
        // 该节点属性发生了改变，重新渲染
        if (!sameNode.$.equals(jsxNode)) {
          await sameNode.$.reRenderProps(jsxNode as JsxNode);
        } else {
          for (const item of sameNode.$.getRealDoms()) {
            parentDom.appendChild(item);
          }
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
    super(jsxNode, parentDom, parentInstance);
    this.instance = instance;
  }
  dom: RealDom;
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
    parentInstance: Instance
  ) {
    super(jsxNode, parentDom, parentInstance);
    this.instance = instance;
  }
  life: LIFE = LIFE.create;
  createdLifeHandles: Function[] = [];
  proxy: Instance;
  setProxy(proxy: Instance) {
    this.proxy = proxy;
  }
  useCreated(fun: Function): void {
    if (this.life === LIFE.create) {
      this.createdLifeHandles.push(fun);
    }
  }
  invokeCreatedLifeHandles(): void {
    this.createdLifeHandles.forEach((fun) => {
      fun();
    });
    this.life = LIFE.created;
  }
  mountedLifeHandles: Function[] = [];
  useMounted(fun: Function): void {
    if (this.life === LIFE.create) {
      this.mountedLifeHandles.push(fun);
    }
  }
  invokeMountedLifeHandles(): void {
    this.mountedLifeHandles.forEach((fun) => {
      fun();
    });
  }
  render: Component;
  setRender(jsxNode: JsxNode, proxy: Instance) {
    this.render = () => {
      const childJsxNode = (jsxNode.type as Component).call(
        proxy,
        jsxNode.props
      );
      if (!isJsxNode(childJsxNode)) {
        return String(childJsxNode);
      }
      return childJsxNode;
    };
  }
  refs: { [name: string]: Instance } = {};
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
          this.life = LIFE.mounted;
          this.renderTask = null;
          resolve();
        }
      });
    });
    return this.renderTask;
  }
}

export function getProxy(instance: Instance) {
  const proxyHooks = ["useMounted", "useCreated"];
  const proxyFields = ["refs"];
  return new Proxy(instance, {
    get(target, key: string) {
      if (proxyHooks.includes(key)) {
        return (target.$ as any)[key].bind(target.$);
      } else if (proxyFields.includes(key)) {
        return (target.$ as any)[key];
      } else {
        return target[key];
      }
    },
    set(target, key, value) {
      if (proxyFields.concat(proxyHooks).includes(key as string)) {
        return true;
      }
      target[key] = value;
      if (instance.$.life >= LIFE.mounted) {
        // 设置响应式的值，并且生命周期在mounted后，重新渲染
        instance.$.renderDom();
      }
      return true;
    },
  });
}
