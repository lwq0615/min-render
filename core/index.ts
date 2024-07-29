import { createInstance } from "./instance/Instance"
import { useReactive } from "./proxy"
import { useCreated, useMounted, useExpose, useRefs, useRendered } from './instance/hooks'
import { RenderRoot } from "./types/instance"
import type { This, Component } from "./types/instance"


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
  useRefs,
  useRendered
}