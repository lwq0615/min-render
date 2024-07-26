import { Component, RenderRoot, This } from './types/instance'
import { UseReactive } from './types/proxy'


declare namespace Types {

  var renderRoot: RenderRoot

  var This: This

  var Component: Component

  var useReactive: UseReactive
  
  var useCreated: This['useCreated']
  
  var useMounted: This['useMounted']

  var useExpose: This['useExpose']
  
  var useRefs: This['useRefs']

}


export = Types