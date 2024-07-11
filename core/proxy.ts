import { Instance } from "./instance/Instance";
import { LIFE, This } from "./types/instance";
import { isObject } from "./utils";

const FIELD_PROXY = Symbol("__FIELD_PROXY");
const FIELD_WATCHER = Symbol("__FIELD_WATCHER");

const instanceArr: Instance[] = [];
// 开始收集依赖
export function callInstanceRenderStart(instance: Instance) {
  instanceArr.push(instance);
}
// 收集依赖结束
export function callInstanceRenderEnd() {
  instanceArr.pop();
}

class ProxyData {
  // 存放属性代理对象
  [FIELD_PROXY]: { [key: string | number | symbol]: any } = {};
  // 存放依赖于每个属性的组件实例
  [FIELD_WATCHER]: {
    [key: string | number | symbol]: Instance[];
  } = {};
}

// 读取代理对象的属性值
function proxyFieldGet(target: any, key: any, proxyData: ProxyData): any {
  // 如果是在render函数执行的过程中，就开始收集依赖于该数据的实例
  if (instanceArr[0]) {
    if (!Array.isArray(proxyData[FIELD_WATCHER][key])) {
      proxyData[FIELD_WATCHER][key] = [];
    }
    proxyData[FIELD_WATCHER][key].push(instanceArr[0]);
    instanceArr[0].pushUnListenHandler(() => {
      const index = proxyData[FIELD_WATCHER][key].indexOf(instanceArr[0]);
      proxyData[FIELD_WATCHER][key].splice(index, 1);
    });
  }
  // 递归获取代理对象
  if (proxyData[FIELD_PROXY][key]) {
    return proxyData[FIELD_PROXY][key];
  } else {
    // 只代理数组和对象
    if (!Array.isArray(target[key]) && !isObject(target[key])) {
      return target[key];
    } else {
      const value = getProxy(target[key]);
      proxyData[FIELD_PROXY][key] = value;
      return value;
    }
  }
}

// 设置代理对象的属性值
function proxyFieldSet(
  target: any,
  key: any,
  value: any,
  proxyData: ProxyData
): boolean {
  const proxy = getProxy(value);
  // 代理后的值与原来相等，说明是无需代理的对象
  if (target[key] === proxy) {
    // 删除原来的代理对象缓存
    delete proxyData[FIELD_PROXY][key];
  } else {
    proxyData[FIELD_PROXY][key] = proxy;
  }
  target[key] = value;
  // 遍历依赖于该数据的实例，执行实例渲染函数更新视图
  proxyData[FIELD_WATCHER][key]?.forEach((instance: Instance) => {
    if (instance.life >= LIFE.mounted) {
      instance.renderDom();
    }
  });
  return true;
}

function getObjectProxy(obj: any) {
  const proxyData = new ProxyData();
  return new Proxy(obj, {
    get(target, key) {
      return proxyFieldGet(target, key, proxyData);
    },
    set(target, key, value) {
      return proxyFieldSet(target, key, value, proxyData);
    },
  });
}

// 会改变原数组的方法
const arrFuns: Array<keyof Array<any>> = [
  "pop",
  "push",
  "shift",
  "unshift",
  "reverse",
  "sort",
  "splice",
  "copyWithin",
];
function getArrayProxy(arr: any[]): any[] {
  const proxyData = new ProxyData();
  return new Proxy(arr, {
    get(target, key: any) {
      if (typeof key === "symbol") {
        return target[key as any];
      } else if (Number(key) == key) {
        return proxyFieldGet(target, key, proxyData);
      } else if (arrFuns.includes(key)) {
        return target[key];
      } else {
        return target[key];
      }
    },
    set(target, key: any, value) {
      if (typeof key === "symbol") {
        target[key as any] = value;
        return true;
      } else if (Number(key) == key) {
        return proxyFieldSet(target, key, value, proxyData);
      } else {
        target[key] = value;
        return true;
      }
    },
  });
}

const proxyHooks: Array<keyof This> = ["useMounted", "useCreated", "useExpose"];
const proxyFields: Array<keyof This> = ["refs"];
function getInstanceProxy(instance: Instance) {
  const obj = {} as any;
  proxyHooks.forEach((hook) => {
    obj[hook] = (instance as any)[hook].bind(instance);
  });
  proxyFields.forEach((key) => {
    obj[key] = instance[key];
  });
  const proxy = getProxy(obj);
  return new Proxy(obj, {
    get(target, key: any) {
      if (proxyHooks.concat(proxyFields).includes(key)) {
        return obj[key];
      } else {
        return proxy[key];
      }
    },
    set(target, key, value) {
      if (proxyHooks.concat(proxyFields).includes(key as any)) {
        return false;
      }
      proxy[key] = value;
      return true;
    },
  });
}

export function getProxy(obj: any): any {
  if (obj instanceof Instance) {
    return getInstanceProxy(obj);
  } else if (Array.isArray(obj)) {
    return getArrayProxy(obj);
  } else if (isObject(obj)) {
    return getObjectProxy(obj);
  } else {
    return obj;
  }
}
