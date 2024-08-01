import { Refs, This } from 'core/types/instance';
import { ObjectKey } from 'core/types/object';
import { Instance } from './Instance';

export class ThisProperties implements This {
  constructor(instance: Instance) {
    this.#instance = instance;
  }
  #instance: Instance;
  [name: ObjectKey]: any;

  useMounted: This['useMounted'] = function (...args) {
    return this.#instance.useMounted(...args);
  };  
  useCreated: This['useCreated'] = function (...args) {
    return this.#instance.useCreated(...args);
  };  
  useExpose: This['useExpose'] = function (...args) {
    return this.#instance.useExpose(...args);
  };  
  useNext: This['useNext'] = function (...args) {
    return this.#instance.useNext(...args);
  };  
  useWatch: This['useWatch'] = function (...args) {
    return this.#instance.useWatch(...args);
  };  
  get refs(): Refs {
    return this.useRefs()
  }
  useRefs: This['useRefs'] = function (...args) {
    return this.#instance.useRefs(...args);
  };  
}

export function defineThisProperties(prototypes: { [name: ObjectKey]: any }) {
  Object.keys(prototypes).forEach((key) => {
    ThisProperties.prototype[key] = prototypes[key];
  });
}
