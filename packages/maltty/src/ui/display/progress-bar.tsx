import { Text } from 'ink'
import type { ReactElement } from 'react'
import { match } from 'ts-pattern'

import { colors } from '../theme.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Visual style for the progress bar characters.
 */
export type ProgressBarStyle = 'light' | 'heavy' | 'block'

/**
 * Props for the {@link ProgressBar} component.
 */
export interface ProgressBarProps {
  /** Current progress value. */
  readonly value: number

  /** Maximum value (defaults to 100). */
  readonly max?: number

  /** Optional label displayed after the percentage. */
  readonly label?: string

  /** Visual style of the bar characters. */
  readonly style?: ProgressBarStyle

  /** Width of the bar in characters. */
  readonly size?: number
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * A horizontal progress bar with percentage display.
 *
 * Renders completed segments in cyan and remaining segments as dim text.
 * The style prop controls the characters used for completed and remaining
 * portions of the bar.
 *
 * @param props - The progress bar props.
 * @returns A rendered progress bar element.
 */
export function ProgressBar({
  value,
  max = 100,
  label,
  style = 'block',
  size = 20,
}: ProgressBarProps): ReactElement {
  const ratio = match(max > 0)
    .with(true, () => Math.min(1, Math.max(0, value / max)))
    .with(false, () => 0)
    .exhaustive()
  const percentage = Math.round(ratio * 100)
  const guardedSize = Math.max(0, size)
  const filledCount = Math.round(ratio * guardedSize)
  const emptyCount = guardedSize - filledCount
  const chars = resolveChars(style)
  const filledBar = chars.filled.repeat(filledCount)
  const emptyBar = chars.empty.repeat(emptyCount)

  return (
    <Text>
      <Text color={colors.primary}>{filledBar}</Text>
      <Text dimColor>{emptyBar}</Text>
      <Text>{` ${String(percentage)}%`}</Text>
      {match(label)
        .with(undefined, () => null)
        .otherwise((text) => (
          <Text>{` ${text}`}</Text>
        ))}
    </Text>
  )
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Character pair for rendering the progress bar.
 *
 * @private
 */
interface BarChars {
  readonly filled: string
  readonly empty: string
}

/**
 * Resolve the filled and empty characters for a given bar style.
 *
 * @private
 * @param style - The progress bar style.
 * @returns The character pair for the given style.
 */
function resolveChars(style: ProgressBarStyle): BarChars {
  return match(style)
    .with('light', () => ({ filled: '\u2591', empty: ' ' }))
    .with('heavy', () => ({ filled: '\u2593', empty: '\u2591' }))
    .with('block', () => ({ filled: '\u2588', empty: '\u2591' }))
    .exhaustive()
}
