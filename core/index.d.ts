import { Component, RenderRoot, This } from './types/instance'
import { UseStore } from './types/proxy'


declare namespace Types {

  var renderRoot: RenderRoot

  var This: This

  var Component: Component

  var useStore: UseStore

}


export = Types