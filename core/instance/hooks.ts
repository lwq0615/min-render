import { InstanceExpose, Watcher } from "core/types/instance";
import { getRenderingInstance } from "./renderDepend";
import { Instance } from "./Instance";

function getRendering(): Instance {
  const renderingInstance = getRenderingInstance();
  if(!renderingInstance) {
    throw new Error("hook function must be called in Component function and it's must be sync run")
  }
  return renderingInstance
}

export function useCreated(fun: Function) {
  return getRendering().useCreated(fun)
}

export function useMounted(fun: Function) {
  return getRendering().useMounted(fun)
}

export function useExpose(expose: InstanceExpose) {
  return getRendering().useExpose(expose)
}

export function useRefs() {
  return getRendering().useRefs()
}

export function useNext(fun: Function) {
  return getRendering().useNext(fun)
}

export function useWatch(fun: Watcher['handler'], depends: Watcher['depends']) {
  return getRendering().useWatch(fun, depends)
}