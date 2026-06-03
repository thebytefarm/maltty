import type { Instance, RenderOptions, RenderToStringOptions } from 'ink'
import type { ReactNode } from 'react'
import React from 'react'

import type { CommandContext } from '../context/types.js'
import { MalttyProvider } from './provider.js'
import { toScreenContext } from './screen.js'

/**
 * Render a React element as a live Ink terminal application with the maltty
 * screen context injected.
 *
 * Wraps the provided node in a {@link MalttyProvider} that supplies the
 * screen context (React-backed `log`, `spinner`, `store`, and any
 * middleware-decorated properties). Returns the raw Ink {@link Instance}
 * so callers have full lifecycle control — `waitUntilExit()`, `unmount()`,
 * `rerender()`, etc.
 *
 * @param node - The React element to render.
 * @param ctx - The command context to convert and inject as screen context.
 * @param options - Optional Ink render options (stdout, stdin, debug, etc.).
 * @returns The Ink render instance.
 */
export async function render(
  node: ReactNode,
  ctx: CommandContext,
  options?: RenderOptions
): Promise<Instance> {
  const { render: inkRender } = await import('ink')
  const screenCtx = toScreenContext(ctx)
  return inkRender(<MalttyProvider value={screenCtx}>{node}</MalttyProvider>, options)
}

/**
 * Render a React element to a string with the maltty screen context injected.
 *
 * Wraps the provided node in a {@link MalttyProvider} and delegates to Ink's
 * `renderToString`. Useful for generating documentation, writing output to
 * files, testing, or scenarios where rendered output is needed as a string
 * without a persistent terminal session.
 *
 * @param node - The React element to render.
 * @param ctx - The command context to convert and inject as screen context.
 * @param options - Optional render-to-string options (columns width).
 * @returns The rendered string output.
 */
export async function renderToString(
  node: ReactNode,
  ctx: CommandContext,
  options?: RenderToStringOptions
): Promise<string> {
  const { renderToString: inkRenderToString } = await import('ink')
  const screenCtx = toScreenContext(ctx)
  return inkRenderToString(<MalttyProvider value={screenCtx}>{node}</MalttyProvider>, options)
}
