import { Instance } from "./instance/Instance";
import { LIFE } from "./types/instance";
import { isObject } from "./utils";

const FIELD_PROXY = Symbol("__FIELD_PROXY");
const FIELD_WATCHER = Symbol("__FIELD_WATCHER");

const instanceArr: Instance[] = []
export function callInstanceRenderStart(instance: Instance) {
  instanceArr.push(instance)
}
export function callInstanceRenderEnd() {
  instanceArr.pop()
}

function getObjectProxy(obj: any) {
  obj[FIELD_PROXY] = {} as { [key: string | number | symbol]: any }
  obj[FIELD_WATCHER] = {} as { [key: string | number | symbol]: Instance[] }
  return new Proxy(obj, {
    get(target, key) {
      if (instanceArr[0]) {
        if (!Array.isArray(target[FIELD_WATCHER][key])) {
          target[FIELD_WATCHER][key] = []
        }
        target[FIELD_WATCHER][key].push(instanceArr[0])
        instanceArr[0].$.pushUnListenHandler(() => {
          const index = target[FIELD_WATCHER][key].indexOf(instanceArr[0])
          target[FIELD_WATCHER][key].splice(index, 1)
        })
      }
      if (target[FIELD_PROXY][key]) {
        return target[FIELD_PROXY][key]
      } else {
        if(!Array.isArray(target[key]) && !isObject(target[key])) {
          return target[key]
        }else {
          const proxy = getProxy(target[key])
          target[FIELD_PROXY][key] = proxy
          return proxy
        }
      }
    },
    set(target, key, value) {
      const proxy = getProxy(value);
      if(target[key] === proxy) {
        delete target[FIELD_PROXY][key]
      }else {
        target[FIELD_PROXY][key] = proxy
      }
      target[key] = value;
      target[FIELD_WATCHER][key]?.forEach((instance: Instance) => {
        if (instance.$.life >= LIFE.mounted) {
          // 设置响应式的值，并且生命周期在mounted后，重新渲染
          instance.$.renderDom();
        }
      })
      return true;
    },
  });
}

const proxyHooks = ["useMounted", "useCreated", "useExpose"];
const proxyFields = ["refs"];
function getInstanceProxy(instance: Instance) {
  const obj = {} as any
  const proxy = getProxy(obj)
  return new Proxy(obj, {
    get(target, key: any) {
      if (proxyHooks.includes(key)) {
        return (instance.$ as any)[key].bind(instance.$);
      } else if (proxyFields.includes(key)) {
        return (instance.$ as any)[key];
      } else {
        return proxy[key];
      }
    },
    set(target, key, value) {
      if (proxyHooks.concat(proxyFields).includes(key as any)) {
        return false
      }
      proxy[key] = value;
      return true
    }
  })
}

export function getProxy<T>(obj: T): T {
  if (obj instanceof Instance) {
    return getInstanceProxy(obj);
  } else if (Array.isArray(obj)) {
    return getObjectProxy(obj)
  } else if (isObject(obj)) {
    return getObjectProxy(obj);
  } else {
    return obj;
  }
}