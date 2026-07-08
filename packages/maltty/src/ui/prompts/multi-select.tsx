import { Box, useInput } from 'ink'
import type { ReactElement } from 'react'
import { useState } from 'react'
import { match } from 'ts-pattern'

import { ErrorMessage } from '../display/error-message.js'
import { ScrollArea } from '../layout/scroll-area.js'
import { symbols } from '../theme.js'
import { resolveDirection, resolveFirstEnabledIndex, resolveNextFocusIndex } from './navigation.js'
import { OptionRow } from './option-row.js'
import type { PromptOption, PromptProps } from './types.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Props for the {@link MultiSelect} component.
 *
 * @typeParam TValue - The type of each option's value.
 */
export interface MultiSelectProps<TValue> extends PromptProps {
  /** The list of selectable options. */
  readonly options: readonly PromptOption<TValue>[]

  /** The initially selected values. */
  readonly defaultValue?: readonly TValue[]

  /** Maximum number of visible options before scrolling. */
  readonly maxVisible?: number

  /** When `true`, at least one option must be selected to submit. */
  readonly required?: boolean

  /** Callback fired when the selection changes. */
  readonly onChange?: (value: readonly TValue[]) => void

  /** Callback fired when the selection is submitted via Enter. */
  readonly onSubmit?: (value: readonly TValue[]) => void
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * A multi-value select prompt with checkbox indicators and keyboard navigation.
 *
 * Renders a vertical list of options with checkbox-style indicators. Users
 * toggle selections with Space and submit with Enter. Disabled options are
 * rendered dimmed with strikethrough and cannot be toggled.
 *
 * **Keyboard shortcuts:**
 * - Up/Down arrows — navigate between enabled options
 * - Space — toggle the focused option
 * - Enter — submit the current selection
 *
 * @typeParam TValue - The type of each option's value.
 * @param props - The multi-select component props.
 * @returns A rendered multi-select element.
 */
export function MultiSelect<TValue>({
  options,
  defaultValue,
  maxVisible = 5,
  required = false,
  onChange,
  onSubmit,
  focused = true,
  disabled = false,
}: MultiSelectProps<TValue>): ReactElement {
  const initialSelected = resolveInitialSelected(options, defaultValue)
  const [focusedIndex, setFocusedIndex] = useState(resolveFirstEnabledIndex(options))
  const [selectedIndices, setSelectedIndices] = useState<ReadonlySet<number>>(initialSelected)
  const [validationError, setValidationError] = useState<string | undefined>(undefined)

  useInput(
    (input, key) => {
      if (key.return) {
        if (required && selectedIndices.size === 0) {
          setValidationError('At least one option must be selected')
          return
        }
        setValidationError(undefined)
        const selectedValues = resolveSelectedValues(options, selectedIndices)
        if (onSubmit) {
          onSubmit(selectedValues)
        }
        return
      }

      if (input === ' ') {
        const option = options[focusedIndex]
        if (option && option.disabled !== true) {
          const nextSelected = toggleIndex(selectedIndices, focusedIndex)
          setSelectedIndices(nextSelected)
          setValidationError(undefined)
          if (onChange) {
            onChange(resolveSelectedValues(options, nextSelected))
          }
        }
        return
      }

      const nextIndex = resolveNextFocusIndex({
        options,
        currentIndex: focusedIndex,
        direction: resolveDirection(key),
      })

      if (nextIndex !== focusedIndex) {
        setFocusedIndex(nextIndex)
      }
    },
    { isActive: focused && !disabled }
  )

  return (
    <Box flexDirection="column">
      <ScrollArea height={Math.min(maxVisible, options.length)} activeIndex={focusedIndex}>
        {options.map((option, index) => {
          const isSelected = selectedIndices.has(index)
          const indicator = match(isSelected)
            .with(true, () => symbols.checkboxOn)
            .with(false, () => symbols.checkboxOff)
            .exhaustive()

          return (
            <OptionRow
              key={String(option.value)}
              option={option}
              indicator={indicator}
              isFocused={index === focusedIndex}
              isSelected={isSelected}
              disabled={disabled}
            />
          )
        })}
      </ScrollArea>
      <ErrorMessage message={validationError} />
    </Box>
  )
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Toggle an index in a readonly set, returning a new set.
 *
 * @private
 * @param set - The current selection set.
 * @param index - The index to toggle.
 * @returns A new set with the index toggled.
 */
function toggleIndex(set: ReadonlySet<number>, index: number): ReadonlySet<number> {
  const next = new Set(set)
  if (next.has(index)) {
    next.delete(index)
  } else {
    next.add(index)
  }
  return next
}

/**
 * Resolve the initially selected indices from default values.
 *
 * @private
 * @param options - The option list.
 * @param defaultValue - The default selected values.
 * @returns A set of selected indices.
 */
function resolveInitialSelected<TValue>(
  options: readonly PromptOption<TValue>[],
  defaultValue: readonly TValue[] | undefined
): ReadonlySet<number> {
  if (defaultValue === undefined) {
    return new Set()
  }

  const indices = options
    .map((option, index) => ({ option, index }))
    .filter(({ option }) => defaultValue.includes(option.value))
    .map(({ index }) => index)

  return new Set(indices)
}

/**
 * Extract the values from selected indices.
 *
 * @private
 * @param options - The option list.
 * @param selectedIndices - The set of selected indices.
 * @returns An array of selected values.
 */
function resolveSelectedValues<TValue>(
  options: readonly PromptOption<TValue>[],
  selectedIndices: ReadonlySet<number>
): readonly TValue[] {
  return options.filter((_, index) => selectedIndices.has(index)).map((option) => option.value)
}
