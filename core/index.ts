import { createInstance } from "./instance/Instance"
import { type RenderRoot, type Component, type This } from "./types/instance"
import { useStore } from "./proxy"


const renderRoot: RenderRoot = (jsxNode, dom) => {
  createInstance(jsxNode, dom)
}

export {
  renderRoot,
  This,
  Component,
  useStore
}