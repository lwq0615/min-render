import { createInstance } from "./instance/Instance"
import { JsxNode, type Component, type This } from "./types/instance"


function renderRoot(jsxNode: JsxNode, dom: HTMLElement) {
  createInstance(jsxNode, dom)
}

export {
  renderRoot,
  This,
  Component
}