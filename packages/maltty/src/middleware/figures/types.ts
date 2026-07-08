import type { Middleware } from '@/types/index.js'

// ---------------------------------------------------------------------------
// Figures context
// ---------------------------------------------------------------------------

/**
 * Terminal figure symbols decorated onto `ctx.figures` by the figures middleware.
 *
 * Maps symbol names (e.g. `tick`, `cross`, `arrow`) to their platform-appropriate
 * Unicode characters. Automatically falls back to simpler glyphs on terminals
 * with poor Unicode support.
 */
export type FiguresContext = Readonly<Record<string, string>>

// ---------------------------------------------------------------------------
// Figures options
// ---------------------------------------------------------------------------

/**
 * Options accepted by the `figures()` middleware factory.
 *
 * @property figures - Override with a custom figures record (useful for testing).
 */
export interface FiguresOptions {
  readonly figures?: FiguresContext
}

// ---------------------------------------------------------------------------
// Figures env
// ---------------------------------------------------------------------------

/**
 * Middleware environment descriptor for the figures middleware.
 *
 * Declares that `ctx.figures` will be available after this middleware runs.
 */
export interface FiguresEnv {
  readonly Variables: {
    readonly figures: FiguresContext
  }
}

// ---------------------------------------------------------------------------
// Figures factory
// ---------------------------------------------------------------------------

/**
 * Factory function type for the figures middleware.
 */
export type FiguresFactory = (options?: FiguresOptions) => Middleware

// ---------------------------------------------------------------------------
// Module augmentation
// ---------------------------------------------------------------------------

/**
 * Augments the base {@link CommandContext} with an optional `figures` property.
 *
 * When a consumer imports `maltty/figures`, this declaration merges
 * `figures` onto `CommandContext` so that `ctx.figures` is typed without manual casting.
 */
declare module 'maltty' {
  interface CommandContext {
    readonly figures: FiguresContext
  }
}
