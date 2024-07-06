
export type JsxNode = {
  type: string | Component | symbol,
  props?: { [key: string]: any, children?: JsxNode[] | JsxNode }
}

export type Component = (props?: unknown) => JsxNode


export enum LIFE {
  create = 0,
  created = 1,
  mounted = 2
};

export type RealDom = HTMLElement | Text


export type Instance$ = {
  key: string,
  dom: RealDom,
  life: LIFE,
  createdLifeHandles: Function[],
  useCreated(fun: Function): void,
  invokeCreatedLifeHandles(): void,
  mountedLifeHandles: Function[],
  useMounted(fun: Function): void,
  invokeMountedLifeHandles(): void,
  render: void | Component,
  renderTask: void | Promise<void>,
  setRender(render: Component): void,
  renderDom(): Promise<void>
}