import { appendRealDomByJsxNode } from '../dom'
import { InstanceType, JsxNode, RealDom } from '../types/instance'
import { getListenerName, isJsxNode, isListener } from '../utils'
import { BaseInstance } from './BaseInstance'
import { Instance } from './Instance'

export function createRealDomInstance(
  jsxNode: JsxNode | string,
  parentDom: RealDom,
  parentInstance: Instance,
): Promise<RealDomInstance> {
  return new Promise(async (resolve) => {
    const instance = new RealDomInstance(parentDom, jsxNode, parentInstance)
    return instance.renderDom().then(() => {
      resolve(instance)
    })
  })
}

export class RealDomInstance extends BaseInstance {
  constructor(parentDom: RealDom, jsxNode: JsxNode | string, parentInstance: Instance) {
    super(jsxNode, parentDom, parentInstance)
  }

  dom: RealDom

  // 设置dom属性
  setProps(props: { [prop: string]: any }) {
    this.jsxNode = this.jsxNode as JsxNode
    for (const prop in props) {
      const contProps = ['children']
      if (contProps.includes(prop)) {
        continue
      }
      const value = props[prop]
      if (isListener(prop)) {
        ;(this.dom as any)[getListenerName(prop)] = value
      } else {
        this.dom = this.dom as HTMLElement
        if (props[prop] === void 0) {
          this.dom.removeAttribute(prop)
        } else {
          this.dom.setAttribute(prop, props[prop])
        }
      }
    }
  }

  // 渲染实例真实dom
  async renderDom(): Promise<void> {
    // 一个组件内的最顶层元素
    const isTop = this.parentInstance.parentDom === this.parentDom
    if (!isJsxNode(this.jsxNode)) {
      const node = document.createTextNode(String(this.jsxNode))
      if (!isTop) {
        this.parentDom.appendChild(node)
      }
      this.dom = node
    } else {
      this.jsxNode = this.jsxNode as JsxNode
      // 原生html标签
      const realDom = document.createElement(this.jsxNode.type as string)
      // 递归渲染子节点
      let childrens: Array<InstanceType> = []
      if (this.jsxNode.props.children !== void 0) {
        if (Array.isArray(this.jsxNode.props.children)) {
          for (const child of this.jsxNode.props.children) {
            childrens = childrens.concat(await appendRealDomByJsxNode(child, realDom, this.parentInstance))
          }
        } else {
          childrens = childrens.concat(
            await appendRealDomByJsxNode(this.jsxNode.props.children, realDom, this.parentInstance),
          )
        }
      }
      this.dom = realDom
      this.setProps(this.jsxNode.props)
      this.childrens = childrens
      if (!isTop) {
        this.parentDom.appendChild(realDom)
      }
      this.parentInstance.setRef(this)
    }
  }

  destroyDom(isTop: boolean) {
    this.dom.remove()
    isTop = false
    super.destroyDom(isTop)
  }

  // prop发生改变，重新渲染当前实例
  async reRenderProps(newJsxNode: JsxNode) {
    if (typeof this.jsxNode === 'string') {
      return
    }
    const diffProps = this.getDiffObj(newJsxNode)
    if (!Object.keys(diffProps).length) {
      this.jsxNode = newJsxNode
    } else {
      // 重新设置变化的属性
      this.jsxNode = newJsxNode
      this.setProps(diffProps)
    }
    await this.reRenderChildren(newJsxNode.props.children)
  }
}
