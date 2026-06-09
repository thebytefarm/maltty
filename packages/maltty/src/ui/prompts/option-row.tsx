import { Box, Text } from 'ink'
import picocolors from 'picocolors'
import type { ReactElement } from 'react'
import { match } from 'ts-pattern'

import { colors, symbols } from '../theme.js'
import type { PromptOption } from './types.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Props for the {@link OptionRow} component.
 */
export interface OptionRowProps<TValue> {
  /** The option to render. */
  readonly option: PromptOption<TValue>

  /** The indicator symbol (e.g. radio or checkbox). */
  readonly indicator: string

  /** Whether this row is currently focused by the cursor. */
  readonly isFocused: boolean

  /** Whether this row is the selected/checked option. */
  readonly isSelected: boolean

  /** Whether the entire prompt is disabled. */
  readonly disabled: boolean
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * Render a single option row with pointer, indicator, label, and hint.
 *
 * Shared by Select, MultiSelect, and similar prompt components to ensure
 * consistent styling and keyboard focus behavior.
 *
 * @param props - The option row props.
 * @returns A rendered option row element.
 */
export function OptionRow<TValue>({
  option,
  indicator,
  isFocused,
  isSelected,
  disabled,
}: OptionRowProps<TValue>): ReactElement {
  const isOptionDisabled = option.disabled === true || disabled

  return (
    <Box>
      <Text dimColor={!isFocused}>
        {match(isFocused)
          .with(true, () => `${symbols.pointer} `)
          .with(false, () => '  ')
          .exhaustive()}
      </Text>
      <Text
        color={match({ isOptionDisabled, isSelected, isFocused })
          .with({ isOptionDisabled: true }, () => 'gray' as const)
          .with({ isSelected: true }, () => colors.primary)
          .with({ isFocused: true }, () => colors.primary)
          .otherwise(() => undefined)}
      >
        {indicator}
      </Text>
      <Text> </Text>
      <Text
        color={match({ isOptionDisabled, isFocused })
          .with({ isOptionDisabled: true }, () => 'gray' as const)
          .with({ isFocused: true }, () => colors.primary)
          .otherwise(() => undefined)}
      >
        {option.label}
        {match(isOptionDisabled && !picocolors.isColorSupported)
          .with(true, () => ' (disabled)')
          .with(false, () => '')
          .exhaustive()}
      </Text>
      {match(option.hint)
        .with(undefined, () => null)
        .otherwise((hint) => (
          <Text
            color={match(isOptionDisabled)
              .with(true, () => 'gray' as const)
              .with(false, () => undefined)
              .exhaustive()}
            dimColor
          >
            {`  ${hint}`}
          </Text>
        ))}
    </Box>
  )
}
