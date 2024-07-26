import { Instance } from "./Instance";


const instanceArr: Instance[] = [];
// 开始收集依赖
export function callInstanceRenderStart(instance: Instance) {
  instanceArr.push(instance);
}
// 收集依赖结束
export function callInstanceRenderEnd() {
  instanceArr.pop();
}

// 获取正在渲染的实例
export function getRenderingInstance(): Instance | void {
  return instanceArr[0];
}
