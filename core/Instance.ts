import { Component, JsxNode, LIFE, RealDom } from "./types/instance";
import { isListener, getListenerName, isJsxNode } from "./utils";
import { v4 as uuidv4 } from "uuid";


function createInstance(component: Component): Promise<Instance> {
  return new Promise((resolve) => {
    const instance = new Instance();
    const proxy = getProxy(instance);
    const render = component.bind(proxy)
    instance.$.setRender(render)
    render()
    instance.$.invokeCreatedLifeHandles()
    instance.$.renderDom().then(() => {
      instance.$.invokeMountedLifeHandles()
      resolve(instance)
    })
  })
}

export function replaceInstanceRealDom(component: Component, dom: Node) {
  createInstanceRealDom(component).then(realDom => {
    dom.parentElement.replaceChild(realDom as any, dom)
  })
}


function createInstanceRealDom(component: Component): Promise<RealDom> {
  return createInstance(component).then(instance => {
    return instance.$.dom;
  });
}

async function createRealDomByJsx(jsxNode: JsxNode): Promise<RealDom> {
  if(!isJsxNode(jsxNode)) {
    return document.createTextNode(String(jsxNode))
  }
  // 组件
  if (typeof jsxNode.type !== "string") {
    return await createInstanceRealDom(jsxNode.type);
  }
  // 原生html标签
  const realDom = document.createElement(jsxNode.type);
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
        realDom.append(await createRealDomByJsx(child));
      }
    }
    // 是非文本(自定义组件 || 原生html标签)
    else if (isJsxNode(jsxNode.props.children)) {
      realDom.append(await createRealDomByJsx(jsxNode.props.children));
    } else {
      realDom.append(String(jsxNode.props.children));
    }
  }
  return realDom;
}


export class Instance$ {
  key: string = uuidv4()
  dom: RealDom
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
        const jsxNode = this.render();
        const realDom = await createRealDomByJsx(jsxNode);
        if (this.dom) {
          try {
            this.dom.parentElement?.replaceChild(realDom, this.dom)
          } catch (err) { }
        }
        this.dom = realDom;
        this.life = LIFE.mounted;
        this.renderTask = null;
        resolve();
      });
    });
    return this.renderTask;
  }
}

export class Instance {
  [name: string | symbol]: unknown
  $: Instance$ = new Instance$()
}

export function getProxy(instance: Instance) {
  return new Proxy(instance, {
    get(target, key: string) {
      const proxyHooks = ['useMounted', 'useCreated']
      if(proxyHooks.includes(key)) {
        return (target.$ as any)[key].bind(target.$)
      }else {
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
