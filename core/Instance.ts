import { Component, Instance$, JsxNode, LIFE, RealDom } from "./types/instance";
import { isListener, getListenerName } from "./utils";
import { v4 as uuidv4 } from "uuid";

const REACT_ELEMENT_TYPE = Symbol.for("react.element");
function createInstanceRealDom(component: Component): Promise<RealDom> {
  const instance = new Instance();
  const proxy = getProxy(instance);
  const render = component.bind(proxy);
  render();
  instance.$.setRender(render);
  instance.$.invokeCreatedLifeHandles();
  return instance.$.renderDom().then(() => {
    instance.$.invokeMountedLifeHandles();
    return instance.$.dom;
  });
}

async function createRealDomByJsx(jsxNode: JsxNode): Promise<RealDom> {
  if (typeof jsxNode.type !== "string") {
    return await createInstanceRealDom(jsxNode.type);
  }
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
    else if (jsxNode.props.children.$$typeof === REACT_ELEMENT_TYPE) {
      realDom.append(await createRealDomByJsx(jsxNode.props.children));
    } else {
      realDom.append(String(jsxNode.props.children));
    }
  }
  return realDom;
}

export class Instance {
  [name: string | symbol]: unknown
  $: Instance$ = {
    key: uuidv4(),
    dom: null,
    life: LIFE.create,
    createdLifeHandles: [],
    useCreated(fun) {
      this.createdLifeHandles.push(fun);
    },
    invokeCreatedLifeHandles() {
      (this as Instance$).createdLifeHandles.forEach((fun) => {
        fun();
      });
      this.life = LIFE.created;
    },
    mountedLifeHandles: [],
    useMounted(fun) {
      if (this.life === LIFE.create) {
        this.mountedLifeHandles.push(fun);
      }
    },
    invokeMountedLifeHandles() {
      (this as Instance$).mountedLifeHandles.forEach((fun) => {
        fun();
      });
    },
    render: void 0,
    renderTask: void 0,
    setRender(render) {
      this.render = render;
    },
    renderDom() {
      if (this.renderTask) {
        return;
      }
      this.renderTask = new Promise<void>((resolve) => {
        Promise.resolve().then(async () => {
          const jsxNode = this.render();
          const realDom = await createRealDomByJsx(jsxNode);
          if (this.dom) {
            try {
              this.dom.parentElement.replaceChild(realDom, this.dom)
            } catch (err) { }
          }
          this.dom = realDom;
          this.life = LIFE.mounted;
          this.renderTask = null;
          resolve();
        });
      });
      return this.renderTask;
    },
  };
}

export function getProxy(instance: Instance) {
  return new Proxy(instance, {
    get(target, key: string) {
      return target[key];
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
