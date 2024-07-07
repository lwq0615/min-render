import { createInstance } from "./Instance"
import { JsxNode } from "./types/instance"


export function renderRoot(jsxNode: JsxNode, dom: HTMLElement) {
  createInstance(jsxNode, dom)
}