import { useCreated, useExpose, useMounted, useNext, useRefs, useWatch } from './instance/hooks'
import { createInstance } from './instance/Instance'
import { defineThisProperties } from './instance/prototype'
import { reactive } from './proxy'
import type { Component, This } from './types/instance'
import { RenderRoot } from './types/instance'

const renderRoot: RenderRoot = (jsxNode, dom) => {
  createInstance(jsxNode, dom)
}

export {
  Component,
  defineThisProperties,
  reactive,
  renderRoot,
  This,
  useCreated,
  useExpose,
  useMounted,
  useNext,
  useRefs,
  useWatch,
}
