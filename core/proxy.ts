import { Instance } from "./instance/Instance";
import { LIFE, This } from "./types/instance";
import { ObjectKey } from "./types/object";
import { isObject } from "./utils";

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
  constructor(target: any, parentProxyData?: ProxyData, key?: ObjectKey) {
    this.target = target;
    this.key = key;
    this.parentProxyData = parentProxyData;
  }

  target: any;
  // 该对象在父对象中的属性名
  key: ObjectKey;
  // 存放属性代理对象
  fieldProxy: { [key: string | number | symbol]: any } = {};
  // 存放依赖于每个属性的组件实例
  fieldWatcher: {
    [key: string | number | symbol]: Instance[];
  } = {};
  parentProxyData?: ProxyData;

  // 读取代理对象的属性值
  proxyFieldGet(key: any): any {
    // 如果是在render函数执行的过程中，就开始收集依赖于该数据的实例
    if (instanceArr[0]) {
      if (!Array.isArray(this.fieldWatcher[key])) {
        this.fieldWatcher[key] = [];
      }
      this.fieldWatcher[key].push(instanceArr[0]);
      instanceArr[0].pushUnListenHandler(() => {
        const index = this.fieldWatcher[key].indexOf(instanceArr[0]);
        this.fieldWatcher[key].splice(index, 1);
      });
    }
    // 递归获取代理对象
    if (this.fieldProxy[key]) {
      return this.fieldProxy[key];
    } else {
      // 只代理数组和对象
      if (!Array.isArray(this.target[key]) && !isObject(this.target[key])) {
        return this.target[key];
      } else {
        const value = getProxy(this.target[key], this, key);
        this.fieldProxy[key] = value;
        return value;
      }
    }
  }
  // 设置代理对象的属性值
  proxyFieldSet(key: any, value: any): boolean {
    const proxy = getProxy(value, this, key);
    // 代理后的值与原来相等，说明是无需代理的对象
    if (this.target[key] === proxy) {
      // 删除原来的代理对象缓存
      delete this.fieldProxy[key];
    } else {
      this.fieldProxy[key] = proxy;
    }
    this.target[key] = value;
    this.callFieldWatcherUpdate(key);
    return true;
  }
  // 更新依赖于当前代理对象key属性的实例
  callFieldWatcherUpdate(key: any) {
    this.fieldWatcher[key]?.forEach((instance: Instance) => {
      if (instance.life >= LIFE.mounted) {
        instance.renderDom();
      }
    });
    this.callCurrentWatcherUpdate();
  }
  // 更新依赖于当前代理对象的实例
  callCurrentWatcherUpdate() {
    this.parentProxyData?.callFieldWatcherUpdate(this.key);
  }
}

function getObjectProxy(
  obj: any,
  parentProxyData?: ProxyData,
  key?: ObjectKey
) {
  const proxyData = new ProxyData(obj, parentProxyData, key);
  return new Proxy(obj, {
    get(target, key) {
      return proxyData.proxyFieldGet(key);
    },
    set(target, key, value) {
      return proxyData.proxyFieldSet(key, value);
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
function getArrayProxy(
  arr: any[],
  parentProxyData?: ProxyData,
  key?: ObjectKey
): any[] {
  const proxyData = new ProxyData(arr, parentProxyData, key);
  return new Proxy(arr, {
    get(target, key: any) {
      if (typeof key === "symbol") {
        return target[key as any];
      } else if (Number(key) == key) {
        return proxyData.proxyFieldGet(key);
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
        return proxyData.proxyFieldSet(key, value);
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

export function getProxy(
  obj: any,
  parentProxyData?: ProxyData,
  key?: ObjectKey
): any {
  if (obj instanceof Instance) {
    return getInstanceProxy(obj);
  } else if (Array.isArray(obj)) {
    return getArrayProxy(obj, parentProxyData, key);
  } else if (isObject(obj)) {
    return getObjectProxy(obj, parentProxyData, key);
  } else {
    return obj;
  }
}
