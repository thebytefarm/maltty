import type { ComponentType } from 'react'

import type { Decorator } from '../types.js'

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * Build include patterns from the optional CLI flag.
 *
 * @param include - Optional single glob pattern from CLI.
 * @returns Array of include patterns, or undefined for defaults.
 */
export function buildIncludePatterns(include: string | undefined): readonly string[] | undefined {
  if (include === undefined) {
    return undefined
  }
  return [include]
}

/**
 * Apply a list of decorators to a component by reducing from left to right.
 * Each decorator wraps the previous result.
 *
 * @param component - The base story component.
 * @param decorators - The decorators to apply.
 * @returns The fully decorated component.
 */
export function applyDecorators(
  component: ComponentType<Record<string, unknown>>,
  decorators: readonly Decorator[]
): ComponentType<Record<string, unknown>> {
  return decorators.reduce<ComponentType<Record<string, unknown>>>(
    (Comp, decorator) => decorator(Comp),
    component
  )
}
