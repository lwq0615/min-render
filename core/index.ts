import { createRealDomByJsx } from "./Instance"
import { JsxNode } from "./types/instance"


export function renderRoot(jsxNode: JsxNode, dom: Node) {
  createRealDomByJsx(jsxNode).then(realDoms => {
    if (realDoms.length > 1) {
      realDoms.forEach((realDom) => {
        dom.appendChild(realDom)
      })
    } else {
      dom.parentElement.replaceChild(realDoms[0], dom)
    }
  })
}