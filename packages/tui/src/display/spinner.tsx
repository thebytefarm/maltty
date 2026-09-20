import { Text } from 'ink'
import type { ReactElement } from 'react'
import { useEffect, useState } from 'react'
import { match } from 'ts-pattern'

import { colors } from '../theme.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Spinner definition with frames and interval.
 */
interface SpinnerDef {
  readonly interval: number
  readonly frames: readonly string[]
}

/**
 * Available spinner types.
 */
type SpinnerType = 'dots' | 'line' | 'arc' | 'bouncingBar'

/**
 * Props for the {@link Spinner} component.
 */
export interface SpinnerProps {
  /**
   * Text label displayed next to the spinner.
   */
  readonly label?: string

  /**
   * Whether the spinner animates. When `false`, nothing is rendered.
   */
  readonly isActive?: boolean

  /**
   * The spinner type to use.
   */
  readonly type?: SpinnerType
}

// ---------------------------------------------------------------------------
// Spinner data (inlined from cli-spinners)
// ---------------------------------------------------------------------------

/**
 * Built-in spinner definitions.
 *
 * @private
 */
const spinners: Readonly<Record<SpinnerType, SpinnerDef>> = Object.freeze({
  dots: {
    interval: 80,
    frames: Object.freeze(['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']),
  },
  line: {
    interval: 130,
    frames: Object.freeze(['-', '\\', '|', '/']),
  },
  arc: {
    interval: 100,
    frames: Object.freeze(['◜', '◠', '◝', '◞', '◡', '◟']),
  },
  bouncingBar: {
    interval: 80,
    frames: Object.freeze([
      '[    ]',
      '[=   ]',
      '[==  ]',
      '[=== ]',
      '[ ===]',
      '[  ==]',
      '[   =]',
      '[    ]',
      '[   =]',
      '[  ==]',
      '[ ===]',
      '[====]',
      '[=== ]',
      '[==  ]',
      '[=   ]',
    ]),
  },
})

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * An animated terminal spinner that cycles through frames.
 *
 * When `isActive` is `false`, the component renders nothing. The spinner
 * frame is colored cyan and the label is rendered as plain text beside it.
 *
 * @param props - The spinner props.
 * @returns A rendered spinner element, or `null` when inactive.
 */
export function Spinner({
  label,
  isActive = true,
  type = 'dots',
}: SpinnerProps): ReactElement | null {
  const spinner = spinners[type]
  const [frameIndex, setFrameIndex] = useState(0)

  useEffect(() => {
    setFrameIndex(0)

    if (!isActive) {
      return
    }

    const timer = setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % spinner.frames.length)
    }, spinner.interval)

    return () => {
      clearInterval(timer)
    }
  }, [isActive, spinner])

  return match(isActive)
    .with(false, () => null)
    .with(true, () => (
      <Text>
        <Text color={colors.primary}>{spinner.frames[frameIndex]}</Text>
        {match(label)
          .with(undefined, () => null)
          .otherwise((text) => (
            <Text>{` ${text}`}</Text>
          ))}
      </Text>
    ))
    .exhaustive()
}
