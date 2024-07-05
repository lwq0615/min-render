
import { Instance, getProxy } from "./instance";

export function renderRoot(InstanceDom, dom) {
  const instance = new Instance(); 
  const proxy = getProxy(instance);
  const render = InstanceDom.bind(proxy)
  instance.$.setRender(render)
  render()
  instance.$.invokeCreatedLifeHandles()
  instance.$.renderDom().then(() => {
    instance.$.invokeMountedLifeHandles()
    dom.parentElement.replaceChild(instance.$.dom, dom)
  })
}