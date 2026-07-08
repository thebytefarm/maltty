import { Box, Text, useInput } from 'ink'
import type { ReactElement } from 'react'
import { useState } from 'react'
import { match } from 'ts-pattern'

import { colors } from '../theme.js'
import type { PromptProps } from './types.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Props for the {@link Confirm} component.
 */
export interface ConfirmProps extends PromptProps {
  /** Label for the affirmative choice. @default "Yes" */
  readonly active?: string

  /** Label for the negative choice. @default "No" */
  readonly inactive?: string

  /** The initial value. @default true */
  readonly defaultValue?: boolean

  /** Callback fired when the value is submitted via Enter. */
  readonly onSubmit?: (value: boolean) => void
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * A boolean confirm prompt with toggle-style keyboard navigation.
 *
 * Renders two choices side by side. The active choice is styled with
 * cyan color and underline. Users toggle with left/right arrows or
 * y/n keys and submit with Enter.
 *
 * **Keyboard shortcuts:**
 * - Left/Right arrows — toggle between choices
 * - y — select the affirmative choice
 * - n — select the negative choice
 * - Enter — submit the current value
 *
 * @param props - The confirm component props.
 * @returns A rendered confirm element.
 */
export function Confirm({
  active = 'Yes',
  inactive = 'No',
  defaultValue = true,
  onSubmit,
  focused = true,
  disabled = false,
}: ConfirmProps): ReactElement {
  const [value, setValue] = useState(defaultValue)

  useInput(
    (input, key) => {
      if (key.return) {
        if (onSubmit) {
          onSubmit(value)
        }
        return
      }

      if (key.leftArrow || key.rightArrow) {
        setValue(!value)
        return
      }

      if (input === 'y' || input === 'Y') {
        setValue(true)
        return
      }

      if (input === 'n' || input === 'N') {
        setValue(false)
      }
    },
    { isActive: focused && !disabled }
  )

  return (
    <Box gap={1}>
      <ConfirmChoice label={active} isActive={value} disabled={disabled} />
      <Text dimColor>/</Text>
      <ConfirmChoice label={inactive} isActive={!value} disabled={disabled} />
    </Box>
  )
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Props for the {@link ConfirmChoice} component.
 *
 * @private
 */
interface ConfirmChoiceProps {
  readonly label: string
  readonly isActive: boolean
  readonly disabled: boolean
}

/**
 * Render a single confirm choice with active/inactive styling.
 *
 * @private
 * @param props - The choice props.
 * @returns A rendered choice element.
 */
function ConfirmChoice({ label, isActive, disabled }: ConfirmChoiceProps): ReactElement {
  const color = match({ isActive, disabled })
    .with({ disabled: true }, () => undefined)
    .with({ isActive: true }, () => colors.primary)
    .otherwise(() => undefined)

  return (
    <Text color={color} dimColor={!isActive || disabled} underline={isActive && !disabled}>
      {label}
    </Text>
  )
}
