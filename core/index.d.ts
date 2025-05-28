import * as InstanceTypes from './types/instance'
import { Reactive } from './types/proxy'

declare namespace Types {
  var renderRoot: InstanceTypes.RenderRoot

  type This = InstanceTypes.This

  type Component = InstanceTypes.Component

  var reactive: Reactive

  var useCreated: This['useCreated']

  var useMounted: This['useMounted']

  var useExpose: This['useExpose']

  var useRefs: This['useRefs']

  var useNext: This['useNext']

  var useWatch: This['useWatch']

  function defineThisProperties<T extends Object>(obj: T): void
}

export = Types
