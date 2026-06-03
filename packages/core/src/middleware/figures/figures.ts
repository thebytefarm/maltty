import defaultFigures from 'figures'

import { decorateContext } from '@/context/decorate.js'
import { middleware } from '@/middleware.js'
import type { Middleware } from '@/types/index.js'

import type { FiguresEnv, FiguresOptions } from './types.js'

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create a figures middleware that decorates `ctx.figures`.
 *
 * Provides platform-appropriate Unicode symbols (tick, cross, arrow, etc.)
 * on `ctx.figures`. Falls back to simpler glyphs on terminals with poor
 * Unicode support.
 *
 * @param options - Optional middleware configuration.
 * @returns A Middleware instance that adds `ctx.figures`.
 *
 * @example
 * ```ts
 * import { figures } from '@maltty/core/figures'
 *
 * cli({
 *   middleware: [
 *     figures(),
 *   ],
 * })
 * ```
 */
export function figures(options?: FiguresOptions): Middleware<FiguresEnv> {
  const resolved = resolveFigures(options)

  return middleware<FiguresEnv>((ctx, next) => {
    decorateContext(ctx, 'figures', resolved)

    return next()
  })
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Resolve the figures record from options, defaulting to the `figures` package export.
 *
 * @private
 * @param options - Optional middleware configuration.
 * @returns A frozen record of symbol names to Unicode characters.
 */
function resolveFigures(options: FiguresOptions | undefined): Readonly<Record<string, string>> {
  if (options === undefined) {
    return defaultFigures
  }

  if (options.figures !== undefined) {
    return options.figures
  }

  return defaultFigures
}
