import process from 'node:process'

import type { Instance, RenderOptions } from 'ink'
import { render } from 'ink'
import type { ReactNode } from 'react'
import React from 'react'
import { match } from 'ts-pattern'
import { z } from 'zod'

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
 * Parameters for rendering an opt-in pointer-interactive root.
 */
export interface RenderInteractiveParams {
  readonly node: ReactNode
  readonly options?: InteractiveRenderOptions
}

/**
 * Result of validating options and starting an interactive Ink render.
 */
export type RenderInteractiveResult = readonly [Instance, null] | readonly [null, z.ZodError]

const InteractionPointSchema = z.object({
  x: z.number().int().finite(),
  y: z.number().int().finite(),
})

const InteractiveRenderOptionsSchema = z.union([
  z
    .object({
      alternateScreen: z.literal(false),
      interactive: z.boolean().optional(),
      origin: InteractionPointSchema,
    })
    .passthrough(),
  z
    .object({
      alternateScreen: z.literal(true).optional(),
      interactive: z.boolean().optional(),
      origin: InteractionPointSchema.optional(),
    })
    .passthrough(),
])

/**
 * Render an Ink tree with frame-synchronized pointer interaction enabled.
 *
 * The alternate screen is enabled by default so SGR viewport coordinates and
 * Ink layout coordinates share origin `{x: 0, y: 0}`. Inline applications may
 * disable it and provide their known viewport `origin` explicitly.
 *
 * @param params - React tree, Ink options, and interaction surface viewport origin.
 * @returns A Result tuple containing the Ink render instance or validation error.
 */
export function renderInteractive({
  node,
  options = {},
}: RenderInteractiveParams): RenderInteractiveResult {
  return match(InteractiveRenderOptionsSchema.safeParse(options))
    .with({ success: false }, ({ error }) => [null, error] as const)
    .with({ success: true }, () => {
      const {
        alternateScreen = true,
        interactive = true,
        onRender,
        origin = Object.freeze({ x: 0, y: 0 }),
        stdin = process.stdin,
        stdout = process.stdout,
        ...renderOptions
      } = options
      const inkInteractive = interactive && stdout.isTTY === true
      const controller = createInteractionController({
        height: () => stdout.rows ?? 24,
        origin,
        width: () => stdout.columns ?? 80,
        write: (data) => {
          stdout.write(data)
        },
      })
      const renderedNode = match({
        interactive: inkInteractive,
        stdinIsTty: stdin.isTTY === true,
      })
        .with({ interactive: true, stdinIsTty: true }, () => (
          <InteractionRuntime controller={controller}>{node}</InteractionRuntime>
        ))
        .otherwise(() => node)

      return [
        render(renderedNode, {
          ...renderOptions,
          alternateScreen,
          interactive: inkInteractive,
          onRender: (metrics) => {
            controller.commitFrame()
            onRender?.(metrics)
          },
          stdin,
          stdout,
        }),
        null,
      ] as const
    })
    .exhaustive()
}
