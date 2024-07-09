import {
  Component,
  InstanceType,
  JSX_TEXT_TYPE,
  JsxNode,
  JsxType,
  LIFE,
  RealDom,
} from "./types/instance";
import {
  isListener,
  getListenerName,
  isJsxNode,
  isFragmentJsxNode,
  isComponent,
  concatArray,
} from "./utils";
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
    const render = () => {
      const childJsxNode = (jsxNode.type as Component).call(
        proxy,
        jsxNode.props
      );
      if (!isJsxNode(childJsxNode)) {
        return String(childJsxNode);
      }
      return childJsxNode;
    };
    instance.$.setRender(render);
    instance.$.setProxy(proxy);
    render();
    instance.$.invokeCreatedLifeHandles();
    instance.$.renderDom().then(() => {
      instance.$.invokeMountedLifeHandles();
      resolve(instance);
    });
  });
}

/**
 * 渲染jsx节点内容到真实dom
 * @param jsxNode jsx节点
 * @param parentDom 真实dom
 * @param instance 节点所在的组件实例
 */
export async function appendRealDomByJsxNode(
  jsxNode: JsxNode | string,
  parentDom: RealDom,
  instance: Instance
): Promise<Array<InstanceType>> {
  if (typeof jsxNode === "string" || !isJsxNode(jsxNode)) {
    // 返回的不是jsx
    if (!isJsxNode(jsxNode)) {
      const node = document.createTextNode(String(jsxNode));
      parentDom.appendChild(node);
      return [new RealDomInstance(node, parentDom, instance, jsxNode)];
    }
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
              await appendRealDomByJsxNode(child, realDom, instance)
            );
          }
        } else {
          childrens = childrens.concat(
            await appendRealDomByJsxNode(
              jsxNode.props.children,
              realDom,
              instance
            )
          );
        }
      }
      parentDom.appendChild(realDom);
      return [
        new RealDomInstance(realDom, parentDom, instance, jsxNode, childrens),
      ];
    }
  }
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
    if(typeof jsxNode !== 'string') {
      this.key = jsxNode.key;
    }
  }
  key: string;
  jsxNode: JsxNode | string;
  parentDom: RealDom;
  parentInstance: Instance;
  childrens: Array<InstanceType> = [];
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
  renderDom(): Promise<void> {
    if (this.renderTask) {
      return;
    }
    this.renderTask = new Promise<void>((resolve) => {
      Promise.resolve().then(async () => {
        if (this instanceof Instance$) {
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
              this.instance
            );
            this.life = LIFE.mounted;
            this.renderTask = null;
            resolve();
          }
        } else if (this instanceof RealDomInstance$) {
        }
      });
    });
    return this.renderTask;
  }
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
  reRenderProps(newJsxNode: JsxNode) {
    if (typeof this.jsxNode === "string") {
      return;
    }
    this.jsxNode = newJsxNode
    this.renderDom();
  }
  async reRenderChildren(
    newJsxNodes: Array<JsxNode | string> | JsxNode | string
  ): Promise<void> {
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
      const sameNode: InstanceType = this.childrens.find((instance) =>
        instance.$.sameTypeAndKey(jsxNode)
      );
      if (sameNode) {
        // 该节点属性发生了改变，重新渲染
        if (!sameNode.$.equals(jsxNode)) {
          this.reRenderProps(jsxNode as JsxNode);
        }
        for (const item of sameNode.$.getRealDoms()) {
          parentDom.appendChild(item);
        }
      } else {
        await appendRealDomByJsxNode(
          jsxNode,
          parentDom,
          this instanceof Instance ? this : this.parentInstance
        );
      }
    }
  }
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
  equals(jsxNode: JsxNode | string) {
    if (!this.sameTypeAndKey(jsxNode)) {
      return false;
    }
    jsxNode = jsxNode as JsxNode;
    return JSON.stringify(jsxNode) === JSON.stringify(this.jsxNode);
  }
}

// html标签虚拟dom
export class RealDomInstance {
  constructor(
    dom: RealDom,
    parentDom: RealDom,
    parentInstance: Instance,
    jsxNode: JsxNode | string,
    childrens: Array<InstanceType> = []
  ) {
    this.$ = new RealDomInstance$(
      dom,
      parentDom,
      parentInstance,
      jsxNode,
      childrens
    );
  }
  $: RealDomInstance$;
}

class RealDomInstance$ extends BaseInstance {
  constructor(
    dom: RealDom,
    parentDom: RealDom,
    parentInstance: Instance,
    jsxNode: JsxNode | string,
    childrens: Array<InstanceType> = []
  ) {
    super(jsxNode, parentDom, parentInstance);
    this.dom = dom;
    this.childrens = childrens;
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
  instance: Instance;
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
  setRender(render: Component) {
    this.render = render;
  }
  refs: { [name: string]: Instance } = {};
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
