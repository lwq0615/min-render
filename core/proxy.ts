import { Instance } from './instance/Instance';
import { ThisProperties } from './instance/prototype';
import { getRenderingInstance } from './instance/renderDepend';
import { LIFE, This } from './types/instance';
import { ObjectKey } from './types/object';
import { isFunction, isObject } from './utils';

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
  fieldProxy: { [key: ObjectKey]: any } = {};
  // 存放依赖于每个属性的组件实例
  fieldWatcher: {
    [key: ObjectKey]: Set<Instance>;
  } = {};
  parentProxyData?: ProxyData;

  // 读取代理对象的属性值
  proxyFieldGet(key: any): any {
    // 如果是在render函数执行的过程中，就开始收集依赖于该数据的实例
    const renderingInstance = getRenderingInstance();
    if (renderingInstance) {
      if (!(this.fieldWatcher[key] instanceof Set)) {
        this.fieldWatcher[key] = new Set();
      }
      this.fieldWatcher[key].add(renderingInstance);
      renderingInstance.pushUnListenHandler(() => {
        this.fieldWatcher[key].delete(renderingInstance);
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
    // 设置的值没有改变，不做处理，避免无效渲染
    if (Object.is(value, this.target[key])) {
      return true;
    }
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

function getArrayProxy(
  arr: any[],
  parentProxyData?: ProxyData,
  key?: ObjectKey
): any[] {
  const proxyData = new ProxyData(arr, parentProxyData, key);
  return new Proxy(arr, {
    get(target, key: any) {
      if (typeof key === 'symbol') {
        return target[key as any];
      } else if (Number(key) == key) {
        return proxyData.proxyFieldGet(key);
      } else {
        return target[key];
      }
    },
    set(target, key: any, value) {
      if (typeof key === 'symbol') {
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

const proxyHooks: Array<keyof This> = [
  'useMounted',
  'useCreated',
  'useExpose',
  'useNext',
  'useWatch',
  'useRefs',
  'refs',
];
function getInstanceProxy(instance: Instance) {
  const obj = new ThisProperties();
  proxyHooks.forEach((key) => {
    Object.defineProperty(obj, key, {
      get() {
        if (isFunction(instance[key])) {
          return (instance[key] as Function).bind(instance);
        } else {
          return instance[key];
        }
      },
      enumerable: false,
    });
  });
  const proxy = getProxy(obj);
  return new Proxy(obj, {
    get(target, key: any) {
      if (proxyHooks.includes(key)) {
        return obj[key];
      } else {
        return proxy[key];
      }
    },
    set(target, key, value) {
      if (proxyHooks.includes(key as any)) {
        throw new Error(`fields of this [${proxyHooks.join(", ")}] is readonly`)
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

export function useReactive<T>(defaultStore?: T): T {
  if (
    defaultStore !== void 0 &&
    !Array.isArray(defaultStore) &&
    !isObject(defaultStore)
  ) {
    throw new Error('the param of useReactive must be a object or array');
  }
  return getProxy(defaultStore || {});
}
