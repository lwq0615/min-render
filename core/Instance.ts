import { Component, JsxNode, LIFE, RealDom } from "./types/instance";
import { isListener, getListenerName, isJsxNode, isFragmentJsxNode } from "./utils";
import { v4 as uuidv4 } from "uuid";


function createInstance(jsxNode: JsxNode): Promise<Instance> {
  return new Promise((resolve) => {
    const instance = new Instance();
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

export async function createRealDomByJsx(jsxNode: JsxNode): Promise<RealDom[]> {
  // 返回jsx是多节点
  if (isFragmentJsxNode(jsxNode)) {
    if (Array.isArray(jsxNode.props.children)) {
      return await Promise.all(jsxNode.props.children?.map(childJsxNode => {
        return createRealDomByJsx(childJsxNode)
      })).then(res => res.reduce((pre, cur) => pre.concat(cur)))
    } else {
      return await createRealDomByJsx(jsxNode.props.children)
    }
  } else {
    // 返回的不是jsx
    if (!isJsxNode(jsxNode)) {
      return [document.createTextNode(String(jsxNode))]
    }
    // 自定义组件
    else if (typeof jsxNode.type !== "string") {
      return (await createInstance(jsxNode)).$.doms
    } else {
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
            let childrens: RealDom[] = []
            if (Array.isArray(child)) {
              childrens = await Promise.all(child.map(item => createRealDomByJsx(item))).then(res => {
                return res.reduce((pre, cur) => pre.concat(cur))
              })
            } else {
              childrens = await createRealDomByJsx(child)
            }
            childrens.forEach(item => {
              realDom.append(item)
            })
          }
        } else {
          realDom.append((await createRealDomByJsx(jsxNode.props.children))[0]);
        }
      }
      return [realDom];
    }
  }
}


export class Instance$ {
  key: string = uuidv4()
  doms: RealDom[] = []
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
        console.log(jsxNode)
        const realDoms = await createRealDomByJsx(jsxNode);
        // TODO 优化替换逻辑
        this.doms.forEach((dom, i) => {
          try {
            dom.parentElement?.replaceChild(realDoms[i], dom)
          } catch (err) { }
        })
        this.doms = realDoms;
        this.life = LIFE.mounted;
        this.renderTask = null;
        resolve();
      });
    });
    return this.renderTask;
  }
  refs: {[name: string]: Instance} = {}
}

export class Instance {
  [name: string | symbol]: unknown
  $: Instance$ = new Instance$()
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
