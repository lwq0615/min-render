import { isListener, getListenerName } from "./utils";
import { v4 as uuidv4 } from "uuid";

const REACT_ELEMENT_TYPE = Symbol.for("react.element");

const LIFE = {
  create: 0,
  created: 1,
  mounted: 2,
};
function createInstanceRealDom(DomInstance) {
  const instance = new Instance();
  const proxy = getProxy(instance);
  const render = DomInstance.bind(proxy);
  render();
  instance.$.setRender(render);
  instance.$.invokeCreatedLifeHandles();
  return instance.$.renderDom().then(() => {
    instance.$.invokeMountedLifeHandles();
    return instance.$.dom;
  });
}

async function createRealDom(jsxDom) {
  if (typeof jsxDom.type !== "string") {
    return await createInstanceRealDom(jsxDom.type);
  }
  const realDom = document.createElement(jsxDom.type);
  for (const prop in jsxDom.props) {
    const contProps = ["children"];
    if (contProps.includes(prop)) {
      continue;
    }
    const value = jsxDom.props[prop];
    if (isListener(prop)) {
      realDom[getListenerName(prop)] = value;
    } else {
      realDom.setAttribute(prop, value);
    }
  }
  if ("children" in jsxDom.props) {
    if (Array.isArray(jsxDom.props.children)) {
      for (const child of jsxDom.props.children) {
        realDom.append(await createRealDom(child));
      }
    }
    // 是非文本(自定义组件 || 原生html标签)
    else if (jsxDom.props.children.$$typeof === REACT_ELEMENT_TYPE) {
      realDom.append(await createRealDom(jsxDom.props.children));
    } else {
      realDom.append(String(jsxDom.props.children));
    }
  }
  return realDom;
}

export class Instance {
  $ = {
    key: uuidv4(),
    dom: null,
    life: LIFE.create,
    createdLifeHandles: [],
    useCreated(fun) {
      this.createdLifeHandles.push(fun);
    },
    invokeCreatedLifeHandles() {
      this.createdLifeHandles.forEach((fun) => {
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
      this.mountedLifeHandles.forEach((fun) => {
        fun();
      });
    },
    render: null,
    renderTask: null,
    setRender(render) {
      this.render = render;
    },
    renderDom() {
      if (this.renderTask) {
        return;
      }
      this.renderTask = new Promise((resolve) => {
        Promise.resolve().then(async () => {
          const jsxDom = this.render();
          const realDom = await createRealDom(jsxDom);
          if(this.dom) {
            this.dom.parentElement.replaceChild(realDom, this.dom)
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

export function getProxy(instance) {
  return new Proxy(instance, {
    get(target, key) {
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
