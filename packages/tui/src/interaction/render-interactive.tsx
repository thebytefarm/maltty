import process from 'node:process'

import type { Instance, RenderOptions } from 'ink'
import { render } from 'ink'
import type { ReactNode } from 'react'
import React from 'react'

import { InteractionRuntime } from './context.js'
import { createInteractionController } from './controller.js'
import type { InteractionPoint } from './hit-testing.js'

/**
 * Ink render options for an opt-in pointer-interactive root.
 */
export type InteractiveRenderOptions = RenderOptions & {
  readonly origin?: InteractionPoint
} & (
    | {
        readonly alternateScreen?: true
      }
    | {
        readonly alternateScreen: false
        readonly origin: InteractionPoint
      }
  )

/**
 * Render an Ink tree with frame-synchronized pointer interaction enabled.
 *
 * The alternate screen is enabled by default so SGR viewport coordinates and
 * Ink layout coordinates share origin `{x: 0, y: 0}`. Inline applications may
 * disable it and provide their known viewport `origin` explicitly.
 *
 * @param node - React tree containing optional {@link Pressable} nodes.
 * @param options - Ink options and the interaction surface viewport origin.
 * @returns The standard Ink render instance.
 */
export function renderInteractive(
  node: ReactNode,
  options: InteractiveRenderOptions = {}
): Instance {
  const {
    alternateScreen = true,
    onRender,
    origin = Object.freeze({ x: 0, y: 0 }),
    stdout = process.stdout,
    ...renderOptions
  } = options
  const controller = createInteractionController({
    height: () => stdout.rows ?? 24,
    origin,
    width: () => stdout.columns ?? 80,
    write: (data) => {
      stdout.write(data)
    },
  })

  return render(<InteractionRuntime controller={controller}>{node}</InteractionRuntime>, {
    ...renderOptions,
    alternateScreen,
    onRender: (metrics) => {
      controller.commitFrame()
      onRender?.(metrics)
    },
    stdout,
  })
}
