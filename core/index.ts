
import { Instance, getProxy } from "./Instance";
import { Component } from "./types/instance";

export function renderRoot(component: Component, dom: Node) {
  const instance = new Instance(); 
  const proxy = getProxy(instance);
  const render = component.bind(proxy)
  instance.$.setRender(render)
  render()
  instance.$.invokeCreatedLifeHandles()
  instance.$.renderDom().then(() => {
    instance.$.invokeMountedLifeHandles()
    dom.parentElement.replaceChild(instance.$.dom as any, dom)
  })
}