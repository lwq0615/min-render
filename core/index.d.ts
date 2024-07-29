import * as InstanceTypes from './types/instance'
import { UseReactive } from './types/proxy'


declare namespace Types {

  var renderRoot: InstanceTypes.RenderRoot

  type This = InstanceTypes.This

  var Component: InstanceTypes.Component

  var useReactive: UseReactive
  
  var useCreated: This['useCreated']
  
  var useMounted: This['useMounted']

  var useExpose: This['useExpose']
  
  var useRefs: This['useRefs']

  var useRendered: This['useRendered']

}


export = Types