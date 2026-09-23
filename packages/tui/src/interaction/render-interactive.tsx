import process from 'node:process'

import type { Instance, RenderOptions } from 'ink'
import { render } from 'ink'
import type { ReactNode } from 'react'
import React from 'react'
import { match } from 'ts-pattern'
import { z } from 'zod'

import { InteractionRuntime } from './context.js'
import { createInteractionController } from './controller.js'
import type { InteractionHitGrid, InteractionPoint } from './hit-testing.js'

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
      const pointerInteractive = inkInteractive && stdin.isTTY === true
      const controller = createInteractionController({
        height: () => stdout.rows ?? 24,
        origin,
        width: () => stdout.columns ?? 80,
        write: (data) => {
          stdout.write(data)
        },
      })
      const instanceReady = Promise.withResolvers<Instance>()
      const publications = new Set<Promise<void>>()
      const wrapNode = (nextNode: ReactNode): ReactNode =>
        match(pointerInteractive)
          .with(true, () => (
            <InteractionRuntime controller={controller}>{nextNode}</InteractionRuntime>
          ))
          .otherwise(() => nextNode)
      const schedulePublication = (frame: InteractionHitGrid): void => {
        const publication = instanceReady.promise.then(async (instance) => {
          await instance.waitUntilRenderFlush()
          controller.commitFrame(frame)
          return undefined
        })
        publications.add(publication)
        void publication.then(
          () => {
            publications.delete(publication)
            return undefined
          },
          () => {
            publications.delete(publication)
            return undefined
          }
        )
      }
      const instance = render(wrapNode(node), {
        ...renderOptions,
        alternateScreen,
        interactive: inkInteractive,
        onRender: (metrics) => {
          schedulePublication(controller.captureFrame())
          onRender?.(metrics)
        },
        stdin,
        stdout,
      })
      instanceReady.resolve(instance)
      const interactiveInstance = Object.freeze({
        ...instance,
        rerender: (nextNode: ReactNode) => {
          instance.rerender(wrapNode(nextNode))
        },
        waitUntilRenderFlush: async () => {
          await instance.waitUntilRenderFlush()
          await Promise.all(publications)
        },
      })

      return [interactiveInstance, null] as const
    })
    .exhaustive()
}
