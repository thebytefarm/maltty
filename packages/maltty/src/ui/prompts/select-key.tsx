import { Box, Text, useInput } from 'ink'
import type { ReactElement } from 'react'
import { match } from 'ts-pattern'

import { colors } from '../theme.js'
import type { PromptOption, PromptProps } from './types.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Props for the {@link SelectKey} component.
 */
export interface SelectKeyProps<TValue extends string> extends PromptProps {
  /** Options where each `value` is a single key character. */
  readonly options: readonly PromptOption<TValue>[]

  /** Called when the user presses a matching key. */
  readonly onSubmit?: (value: TValue) => void
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * Key-press driven select prompt where each option maps to a single key.
 *
 * Renders options in a vertical list with the key character highlighted
 * in cyan and bold. Pressing the corresponding key immediately fires
 * `onSubmit`. Disabled options are shown dimmed and their key presses
 * are ignored.
 *
 * @param props - The select-key props.
 * @returns A rendered select-key element.
 */
export function SelectKey<TValue extends string>({
  options,
  onSubmit,
  focused = true,
  disabled = false,
}: SelectKeyProps<TValue>): ReactElement {
  useInput(
    (input) => {
      const matched = options.find((opt) => opt.value.toLowerCase() === input.toLowerCase())
      if (matched === undefined || matched.disabled) {
        return
      }
      if (onSubmit) {
        onSubmit(matched.value)
      }
    },
    { isActive: focused && !disabled }
  )

  return (
    <Box flexDirection="column">
      {options.map((option) => (
        <KeyOptionRow key={option.value} option={option} disabled={disabled} />
      ))}
    </Box>
  )
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Props for the {@link KeyOptionRow} component.
 *
 * @private
 */
interface KeyOptionRowProps<TValue extends string = string> {
  readonly option: PromptOption<TValue>
  readonly disabled: boolean
}

/**
 * Render a single option row with the key character highlighted.
 *
 * @private
 * @param props - The row props.
 * @returns A rendered row element.
 */
function KeyOptionRow({ option, disabled }: KeyOptionRowProps): ReactElement {
  const isOptionDisabled = disabled || (option.disabled ?? false)
  const keyChar = option.value.charAt(0)
  const restLabel = option.label.slice(1)
  const startsWithKey = option.label.charAt(0).toLowerCase() === keyChar.toLowerCase()

  return (
    <Box>
      {match(isOptionDisabled)
        .with(true, () => (
          <Text dimColor>
            {'  '}[{keyChar}] {option.label}
          </Text>
        ))
        .with(false, () => (
          <Box>
            <Text>{'  '}</Text>
            <Text>[</Text>
            <Text color={colors.primary} bold>
              {keyChar}
            </Text>
            <Text>] </Text>
            {match(startsWithKey)
              .with(true, () => (
                <Text>
                  <Text color={colors.primary} bold>
                    {option.label.charAt(0)}
                  </Text>
                  {restLabel}
                </Text>
              ))
              .with(false, () => <Text>{option.label}</Text>)
              .exhaustive()}
          </Box>
        ))
        .exhaustive()}
      {match(option.hint)
        .with(undefined, () => null)
        .otherwise((hint) => (
          <Text dimColor> {hint}</Text>
        ))}
    </Box>
  )
}
