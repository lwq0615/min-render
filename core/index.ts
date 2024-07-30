import { createInstance } from "./instance/Instance"
import { useReactive } from "./proxy"
import { useCreated, useMounted, useExpose, useRefs, useRendered, useWatch } from './instance/hooks'
import { RenderRoot } from "./types/instance"
import type { This, Component } from "./types/instance"
import { defineThisProperties } from "./instance/prototype"


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
  useRendered,
  defineThisProperties,
  useWatch
}