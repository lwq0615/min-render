import { createInstance } from "./instance/Instance"
import { useReactive } from "./proxy"
import { useCreated, useMounted, useExpose, useRefs } from './instance/hooks'
import { RenderRoot } from "./types/instance"
import { This, Component } from "./types/instance"


const renderRoot: RenderRoot = (jsxNode, dom) => {
  createInstance(jsxNode, dom)
}

export {
  This,
  Component,
  renderRoot,
  useReactive,
  useCreated,
  useMounted,
  useExpose,
  useRefs
}