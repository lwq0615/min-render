import { Instance } from "./instance/Instance";
import { LIFE } from "./types/instance";

function getObjectProxy(obj: any) {
  return new Proxy(obj, {
    get(target, key) {
      return target[key];
    },
    set(target, key, value) {
      target[key] = value;
      return true;
    },
  });
}

const proxyHooks = ["useMounted", "useCreated", "useExpose"];
const proxyFields = ["refs"];
function getInstanceProxy(instance: Instance) {
  const obj  = {} as any
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
      if(proxyHooks.concat(proxyFields).includes(key as any)) {
        return false
      }
      proxy[key] = value;
      if (instance.$.life >= LIFE.mounted) {
        // 设置响应式的值，并且生命周期在mounted后，重新渲染
        instance.$.renderDom();
      }
      return true
    }
  })
}

export function getProxy<T>(obj: T): T {
  if (obj instanceof Instance) {
    return getInstanceProxy(obj);
  } else if (Array.isArray(obj)) {
    return getObjectProxy(obj)
  } else if (obj instanceof Object) {
    return getObjectProxy(obj);
  } else {
    return obj;
  }
}