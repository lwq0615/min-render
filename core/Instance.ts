import { Component, JsxNode, LIFE, RealDom } from "./types/instance";
import { isListener, getListenerName, isJsxNode, isFragmentJsxNode, isComponent } from "./utils";
import { v4 as uuidv4 } from "uuid";


export function createInstance(jsxNode: JsxNode, parentDom: HTMLElement, parentInstance?: Instance): Promise<Instance> {
  return new Promise((resolve) => {
    const instance = new Instance(parentDom, jsxNode, parentInstance);
    const proxy = getProxy(instance);
    const render = (jsxNode.type as Component).bind(proxy, jsxNode.props)
    instance.$.setRender(render)
    render()
    instance.$.invokeCreatedLifeHandles()
    instance.$.renderDom().then(() => {
      instance.$.invokeMountedLifeHandles()
      resolve(instance)
    })
  })
}

export async function appendRealDomByJsxNode(jsxNode: JsxNode, parentDom: HTMLElement, instance: Instance): Promise<Array<RealDom | Instance>> {
  // 返回jsx是多节点
  if (isFragmentJsxNode(jsxNode)) {
    if (Array.isArray(jsxNode.props.children)) {
      let doms: Array<RealDom | Instance> = []
      for (const childJsxNode of jsxNode.props.children) {
        doms = doms.concat(await appendRealDomByJsxNode(childJsxNode, parentDom, instance))
      }
      return doms
    } else {
      return await appendRealDomByJsxNode(jsxNode.props.children, parentDom, instance)
    }
  } else {
    // 返回的不是jsx
    if (!isJsxNode(jsxNode)) {
      const node = document.createTextNode(String(jsxNode))
      parentDom.appendChild(node)
      return [node]
    }
    // 自定义组件
    else if (isComponent(jsxNode)) {
      return [await createInstance(jsxNode, parentDom, instance)]
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
      if ("children" in jsxNode.props) {
        if (Array.isArray(jsxNode.props.children)) {
          for (const child of jsxNode.props.children) {
            appendRealDomByJsxNode(child, realDom, instance)
          }
        } else {
          appendRealDomByJsxNode(jsxNode.props.children, realDom, instance)
        }
      }
      parentDom.appendChild(realDom);
      return [realDom]
    }
  }
}


export class Instance$ {
  constructor(parentDom: HTMLElement, jsxNode: JsxNode, instance: Instance, parentInstance: Instance) {
    this.parentDom = parentDom
    this.jsxNode = jsxNode
    this.instance = instance
    this.parentInstance = parentInstance
  }
  key: string = uuidv4()
  instance: Instance
  parentInstance: Instance
  jsxNode: JsxNode
  parentDom: HTMLElement
  doms: Array<RealDom | Instance> = []
  life: LIFE = LIFE.create
  createdLifeHandles: Function[] = []
  useCreated(fun: Function): void {
    this.createdLifeHandles.push(fun);
  }
  invokeCreatedLifeHandles(): void {
    this.createdLifeHandles.forEach((fun) => {
      fun();
    });
    this.life = LIFE.created;
  }
  mountedLifeHandles: Function[] = []
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
  render: void | Component
  renderTask: void | Promise<void>
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
          return
        }
        const childJsxNodes = this.render();
        if (this.life >= LIFE.mounted) {
          this.life = LIFE.update
          this.updateDom().then(() => {
            this.life = LIFE.mounted;
            this.renderTask = null;
            resolve();
          })
        } else {
          this.doms = await appendRealDomByJsxNode(childJsxNodes, this.parentDom, this.instance);
          this.life = LIFE.mounted;
          this.renderTask = null;
          resolve();
        }
      });
    });
    return this.renderTask;
  }
  updateDom(): Promise<void> {
    return Promise.resolve()
  }
  refs: { [name: string]: Instance } = {}
}

export class Instance {
  constructor(parentDom: HTMLElement, jsxNode: JsxNode, parentInstance?: Instance) {
    this.$ = new Instance$(parentDom, jsxNode, this, parentInstance)
  }
  [name: string | symbol]: unknown
  $: Instance$
}

export function getProxy(instance: Instance) {
  return new Proxy(instance, {
    get(target, key: string) {
      const proxyHooks = ['useMounted', 'useCreated']
      const proxyFields = ['refs']
      if (proxyHooks.includes(key)) {
        return (target.$ as any)[key].bind(target.$)
      } else if (proxyFields.includes(key)) {
        return (target.$ as any)[key]
      } else {
        return target[key];
      }
    },
    set(target, key, value) {
      target[key] = value;
      if (instance.$.life >= 2) {
        // 设置响应式的值，并且生命周期在mounted后，重新渲染
        instance.$.renderDom();
      }
      return true;
    },
  });
}
