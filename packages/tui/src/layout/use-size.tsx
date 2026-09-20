import type { DOMElement } from 'ink'
import { measureElement } from 'ink'
import type { RefObject } from 'react'
import { useEffect, useReducer, useState } from 'react'

import { useTerminalSize } from './fullscreen.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Measured dimensions returned by {@link useSize}.
 */
export interface Size {
  readonly width: number
  readonly height: number
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * Measure the computed dimensions of a `<Box>` element, or fall back to
 * terminal dimensions when no ref is provided.
 *
 * Attaches to a `<Box ref={ref}>` and reads the Yoga-computed width and
 * height after each render. When `ref` is omitted or its `.current` is
 * `null`, returns the terminal's column and row count instead — behaving
 * like a "window size" hook.
 *
 * Uses a render counter to ensure measurement runs after the ref is
 * populated on the first mount and after layout changes.
 *
 * @example
 * ```tsx
 * // Measure a specific element
 * const ref = useRef<DOMElement>(null)
 * const { width, height } = useSize(ref)
 * return <Box ref={ref} flexGrow={1}>...</Box>
 *
 * // Fall back to terminal size
 * const { width, height } = useSize()
 * ```
 *
 * @param ref - Optional ref to a `<Box>` element. When omitted, returns
 *   terminal dimensions.
 * @returns The measured width and height.
 */
export function useSize(ref?: RefObject<DOMElement | null>): Size {
  const terminal = useTerminalSize()
  const [size, setSize] = useState<Size>(() => resolveInitialSize(ref, terminal))
  const [tick, bump] = useReducer(incrementTick, 0)

  // Schedule a re-measurement after mount so the ref is populated.
  useEffect(() => {
    bump()
  }, [])

  useEffect(() => {
    if (ref === undefined) {
      setSize((prev) => updateIfChanged(prev, { width: terminal.columns, height: terminal.rows }))
      return
    }
    if (ref.current === null) {
      return
    }
    const measured = measureElement(ref.current)
    setSize((prev) => updateIfChanged(prev, measured))
  }, [ref, terminal.columns, terminal.rows, tick])

  return size
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Compute the initial size from a ref or terminal dimensions.
 *
 * @private
 * @param ref - Optional element ref.
 * @param terminal - Current terminal dimensions.
 * @returns The initial size.
 */
function resolveInitialSize(
  ref: RefObject<DOMElement | null> | undefined,
  terminal: { readonly columns: number; readonly rows: number }
): Size {
  if (ref === undefined) {
    return Object.freeze({ width: terminal.columns, height: terminal.rows })
  }
  if (ref.current === null) {
    return Object.freeze({ width: 0, height: 0 })
  }
  return Object.freeze(measureElement(ref.current))
}

/**
 * Reducer that increments a tick counter. Used to force re-measurement
 * after the ref is populated on mount.
 *
 * @private
 * @param n - The current tick count.
 * @returns The next tick count.
 */
function incrementTick(n: number): number {
  return n + 1
}

/**
 * Return the next size only when dimensions have actually changed,
 * preserving referential identity to avoid unnecessary re-renders.
 *
 * @private
 * @param prev - The previous size.
 * @param next - The candidate next size.
 * @returns The previous size if unchanged, otherwise the next size (frozen).
 */
function updateIfChanged(
  prev: Size,
  next: { readonly width: number; readonly height: number }
): Size {
  if (prev.width === next.width && prev.height === next.height) {
    return prev
  }
  return Object.freeze({ width: next.width, height: next.height })
}
