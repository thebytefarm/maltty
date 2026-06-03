import figures from 'figures'
import { match } from 'ts-pattern'

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------

/**
 * Color palette used by maltty UI components.
 */
export const colors: Readonly<{
  readonly primary: 'cyan'
  readonly success: 'green'
  readonly error: 'red'
  readonly warning: 'yellow'
  readonly info: 'blue'
}> = Object.freeze({
  primary: 'cyan',
  success: 'green',
  error: 'red',
  warning: 'yellow',
  info: 'blue',
} as const)

/**
 * Color type derived from the palette.
 */
export type ThemeColor = (typeof colors)[keyof typeof colors]

/**
 * Variant type shared by display components (Alert, StatusMessage).
 */
export type Variant = 'info' | 'success' | 'error' | 'warning'

/**
 * Resolve the theme color for a given variant.
 *
 * @param variant - The display variant.
 * @returns The color string from the theme palette.
 */
export function resolveVariantColor(variant: Variant): ThemeColor {
  return match(variant)
    .with('info', () => colors.info)
    .with('success', () => colors.success)
    .with('error', () => colors.error)
    .with('warning', () => colors.warning)
    .exhaustive()
}

// ---------------------------------------------------------------------------
// Symbols
// ---------------------------------------------------------------------------

/**
 * Symbol set used by maltty UI components for indicators and status icons.
 */
export const symbols: Readonly<{
  readonly radioOn: string
  readonly radioOff: string
  readonly checkboxOn: string
  readonly checkboxOff: string
  readonly pointer: string
  readonly tick: string
  readonly cross: string
  readonly warning: string
  readonly info: string
  readonly circle: string
  readonly line: string
  readonly ellipsis: string
}> = Object.freeze({
  radioOn: figures.radioOn,
  radioOff: figures.radioOff,
  checkboxOn: figures.checkboxOn,
  checkboxOff: figures.checkboxOff,
  pointer: figures.pointer,
  tick: figures.tick,
  cross: figures.cross,
  warning: figures.warning,
  info: figures.info,
  circle: figures.circle,
  line: figures.line,
  ellipsis: figures.ellipsis,
} as const)
