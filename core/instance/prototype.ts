import { ObjectKey } from 'core/types/object'

export class ThisProperties {
  [name: ObjectKey]: any
}

export function defineThisProperties(prototypes: { [name: ObjectKey]: any }) {
  Object.keys(prototypes).forEach((key) => {
    ThisProperties.prototype[key] = prototypes[key]
  })
}
