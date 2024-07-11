import { Instance } from "./instance/Instance";
import { LIFE, This } from "./types/instance";
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
      // 如果是在render函数执行的过程中，就开始收集依赖于该数据的实例
      if (instanceArr[0] && instanceArr[0].life >= LIFE.created) {
        if (!Array.isArray(target[FIELD_WATCHER][key])) {
          target[FIELD_WATCHER][key] = []
        }
        target[FIELD_WATCHER][key].push(instanceArr[0])
        instanceArr[0].pushUnListenHandler(() => {
          const index = target[FIELD_WATCHER][key].indexOf(instanceArr[0])
          target[FIELD_WATCHER][key].splice(index, 1)
        })
      }
      // 递归获取代理对象
      if (target[FIELD_PROXY][key]) {
        return target[FIELD_PROXY][key]
      } else {
        // 只代理数组和对象
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
      // 代理后的值与原来相等，说明是无需代理的对象
      if(target[key] === proxy) {
        // 删除原来的代理对象缓存
        delete target[FIELD_PROXY][key]
      }else {
        target[FIELD_PROXY][key] = proxy
      }
      target[key] = value;
      // 遍历依赖于该数据的实例，执行实例渲染函数更新视图
      target[FIELD_WATCHER][key]?.forEach((instance: Instance) => {
        if (instance.life >= LIFE.mounted) {
          instance.renderDom();
        }
      })
      return true;
    },
  });
}

const proxyHooks: Array<keyof This> = ["useMounted", "useCreated", "useExpose"];
const proxyFields: Array<keyof This>  = ["refs"];
function getInstanceProxy(instance: Instance) {
  const obj = {} as any
  proxyHooks.forEach(hook => {
    obj[hook] = (instance as any)[hook].bind(instance);
  })
  proxyFields.forEach(key => {
    obj[key] = instance[key]
  })
  const proxy = getProxy(obj)
  return new Proxy(obj, {
    get(target, key: any) {
      if (proxyHooks.concat(proxyFields).includes(key)) {
        return obj[key]
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