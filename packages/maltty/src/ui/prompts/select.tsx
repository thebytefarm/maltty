import { useInput } from 'ink'
import type { ReactElement } from 'react'
import { useState } from 'react'
import { match } from 'ts-pattern'

import { ScrollArea } from '../layout/scroll-area.js'
import { symbols } from '../theme.js'
import { resolveDirection, resolveInitialIndex, resolveNextFocusIndex } from './navigation.js'
import { OptionRow } from './option-row.js'
import type { PromptOption, PromptProps } from './types.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Props for the {@link Select} component.
 *
 * @typeParam TValue - The type of each option's value.
 */
export interface SelectProps<TValue> extends PromptProps {
  /** The list of selectable options. */
  readonly options: readonly PromptOption<TValue>[]

  /** The initially selected value. */
  readonly defaultValue?: TValue

  /** Maximum number of visible options before scrolling. */
  readonly maxVisible?: number

  /** Callback fired when the focused option changes. */
  readonly onChange?: (value: TValue) => void

  /** Callback fired when an option is submitted via Enter. */
  readonly onSubmit?: (value: TValue) => void
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * A single-value select prompt with keyboard navigation and scroll support.
 *
 * Renders a vertical list of options with radio-style indicators. The focused
 * option is highlighted with a pointer and cyan coloring. Disabled options are
 * rendered dimmed with strikethrough and are skipped during navigation.
 *
 * **Keyboard shortcuts:**
 * - Up/Down arrows — navigate between enabled options
 * - Enter — submit the focused option
 *
 * @typeParam TValue - The type of each option's value.
 * @param props - The select component props.
 * @returns A rendered select element.
 */
export function Select<TValue>({
  options,
  defaultValue,
  maxVisible = 5,
  onChange,
  onSubmit,
  focused = true,
  disabled = false,
}: SelectProps<TValue>): ReactElement {
  const initialIndex = resolveInitialIndex({ options, defaultValue })
  const [focusedIndex, setFocusedIndex] = useState(initialIndex)
  const [selectedIndex, setSelectedIndex] = useState(initialIndex)

  useInput(
    (_input, key) => {
      if (key.return) {
        const option = options[focusedIndex]
        if (option && !option.disabled) {
          setSelectedIndex(focusedIndex)
          if (onSubmit) {
            onSubmit(option.value)
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
        const nextOption = options[nextIndex]
        if (nextOption && onChange) {
          onChange(nextOption.value)
        }
      }
    },
    { isActive: focused && !disabled }
  )

  return (
    <ScrollArea height={Math.min(maxVisible, options.length)} activeIndex={focusedIndex}>
      {options.map((option, index) => {
        const isSelected = index === selectedIndex
        const indicator = match(isSelected)
          .with(true, () => symbols.radioOn)
          .with(false, () => symbols.radioOff)
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
  )
}
