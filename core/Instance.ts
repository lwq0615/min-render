import { Component, JsxNode, LIFE, RealDom } from "./types/instance";
import {
  isListener,
  getListenerName,
  isJsxNode,
  isFragmentJsxNode,
  isComponent,
} from "./utils";


function getDiffKey(jsxNode: JsxNode) {
  return JSON.stringify(jsxNode)
}

/**
 * 创建组件实例
 * @param jsxNode 组件jsx节点
 * @param parentDom 组件渲染的真实父dom
 * @param parentInstance 组件的父实例
 */
export function createInstance(
  jsxNode: JsxNode,
  parentDom: HTMLElement,
  parentInstance?: Instance
): Promise<Instance> {
  return new Promise((resolve) => {
    const instance = new Instance(parentDom, jsxNode, parentInstance);
    const proxy = getProxy(instance);
    const render = (jsxNode.type as Component).bind(proxy, jsxNode.props);
    instance.$.setRender(render);
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
  parentDom: HTMLElement,
  instance: Instance,
  cacheInstances?: Instance[]
): Promise<Array<RealDom | Instance>> {
  if(typeof jsxNode === "string" || !isJsxNode(jsxNode)) {
    // 返回的不是jsx
    if (!isJsxNode(jsxNode)) {
      const node = document.createTextNode(String(jsxNode));
      parentDom.appendChild(node);
      return [node];
    }
  }
  // 返回jsx是多节点
  else if (isFragmentJsxNode(jsxNode)) {
    if (Array.isArray(jsxNode.props.children)) {
      let doms: Array<RealDom | Instance> = [];
      for (const childJsxNode of jsxNode.props.children) {
        doms = doms.concat(
          await appendRealDomByJsxNode(
            childJsxNode,
            parentDom,
            instance,
            cacheInstances
          )
        );
      }
      return doms;
    } else {
      return await appendRealDomByJsxNode(
        jsxNode.props.children,
        parentDom,
        instance,
        cacheInstances
      );
    }
  } else {
    // 自定义组件
    if (isComponent(jsxNode)) {
      const cache = cacheInstances?.find(
        (cacheInstance) => cacheInstance.$.jsxNode.type === jsxNode.type
      );
      // 获取已有的组件实例，减少组件渲染的性能开销
      if (cache && cache.$.key === getDiffKey(jsxNode)) {
        for (const realDom of cache.$.getRealDoms()) {
          parentDom.appendChild(realDom);
        }
        return [cache];
      } else {
        return [await createInstance(jsxNode, parentDom, instance)];
      }
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
      if (jsxNode.props.children !== void 0) {
        if (Array.isArray(jsxNode.props.children)) {
          for (const child of jsxNode.props.children) {
            appendRealDomByJsxNode(child, realDom, instance);
          }
        } else {
          appendRealDomByJsxNode(jsxNode.props.children, realDom, instance);
        }
      }
      parentDom.appendChild(realDom);
      return [realDom];
    }
  }
}

async function reRenderRealDom(
  instance$: Instance$,
  jsxNode: JsxNode | string
): Promise<Array<RealDom | Instance>> {
  for (const dom of instance$.getRealDoms()) {
    dom.remove();
  }
  const childInstances: Instance[] = instance$.doms.filter(
    (item) => item instanceof Instance
  );
  return appendRealDomByJsxNode(
    jsxNode,
    instance$.parentDom,
    instance$.instance,
    childInstances
  );
}

export class Instance {
  constructor(
    parentDom: HTMLElement,
    jsxNode: JsxNode,
    parentInstance?: Instance
  ) {
    this.$ = new Instance$(parentDom, jsxNode, this, parentInstance);
  }
  [name: string | symbol]: unknown;
  $: Instance$;
}

export class Instance$ {
  constructor(
    parentDom: HTMLElement,
    jsxNode: JsxNode,
    instance: Instance,
    parentInstance: Instance
  ) {
    this.parentDom = parentDom;
    this.jsxNode = jsxNode;
    this.instance = instance;
    this.parentInstance = parentInstance;
    this.key = getDiffKey(jsxNode);
  }
  key: string;
  instance: Instance;
  parentInstance: Instance;
  jsxNode: JsxNode;
  parentDom: HTMLElement;
  doms: Array<RealDom | Instance> = [];
  getRealDoms(): Array<RealDom> {
    const realDoms: RealDom[] = [];
    this.doms.map((item) => {
      if (item instanceof Instance) {
        for (const dom of item.$.getRealDoms()) {
          realDoms.push(dom);
        }
      } else {
        realDoms.push(item);
      }
    });
    return realDoms;
  }
  life: LIFE = LIFE.create;
  createdLifeHandles: Function[] = [];
  useCreated(fun: Function): void {
    this.createdLifeHandles.push(fun);
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
  render: void | Component;
  renderTask: void | Promise<void>;
  setRender(render: Component) {
    this.render = render;
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
        if (this.life >= LIFE.mounted) {
          this.life = LIFE.update;
          this.updateDom().then(() => {
            this.life = LIFE.mounted;
            this.renderTask = null;
            resolve();
          });
        } else {
          const childJsxNodes = this.render();
          this.doms = await appendRealDomByJsxNode(
            childJsxNodes,
            this.parentDom,
            this.instance
          );
          this.life = LIFE.mounted;
          this.renderTask = null;
          resolve();
        }
      });
    });
    return this.renderTask;
  }
  updateDom(): Promise<void> {
    if (!this.render) {
      return;
    }
    const childJsxNodes = this.render();
    return reRenderRealDom(this, childJsxNodes).then((doms) => {
      this.doms = doms;
    });
  }
  destroyDom() {
    for (const dom of this.doms) {
      if (dom instanceof Instance) {
        dom.$.destroyDom();
      } else {
        dom.remove();
      }
    }
    this.doms = [];
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
      if (instance.$.life >= 2) {
        // 设置响应式的值，并且生命周期在mounted后，重新渲染
        instance.$.renderDom();
      }
      return true;
    },
  });
}
