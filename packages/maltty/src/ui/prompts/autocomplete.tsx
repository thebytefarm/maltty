import { Box, Text, useInput } from 'ink'
import type { ReactElement } from 'react'
import { useMemo, useState } from 'react'
import { match } from 'ts-pattern'

import { ScrollArea } from '../layout/scroll-area.js'
import { colors, symbols } from '../theme.js'
import { CursorValue } from './cursor-value.js'
import { resolveInitialIndex } from './navigation.js'
import { OptionRow } from './option-row.js'
import { insertCharAt, removeCharAt } from './string-utils.js'
import type { PromptOption, PromptProps } from './types.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Props for the {@link Autocomplete} component.
 */
export interface AutocompleteProps<TValue> extends PromptProps {
  /** The full list of selectable options. */
  readonly options: readonly PromptOption<TValue>[]

  /** Placeholder text shown when the search input is empty. */
  readonly placeholder?: string

  /** Maximum number of visible options in the dropdown. */
  readonly maxVisible?: number

  /** Initially selected value. */
  readonly defaultValue?: TValue

  /** Custom filter function. Defaults to case-insensitive label match. */
  readonly filter?: (search: string, option: PromptOption<TValue>) => boolean

  /** Called when the focused option changes. */
  readonly onChange?: (value: TValue) => void

  /** Called when the user presses Enter to confirm. */
  readonly onSubmit?: (value: TValue) => void
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * Autocomplete prompt with real-time filtering and keyboard navigation.
 *
 * Renders a text input at the top that filters the option list as the user
 * types. Arrow keys navigate the filtered results and Enter selects the
 * currently focused option. Uses {@link ScrollArea} to constrain the visible
 * list to `maxVisible` rows.
 *
 * @param props - The autocomplete props.
 * @returns A rendered autocomplete element.
 */
export function Autocomplete<TValue>({
  options,
  placeholder,
  maxVisible = 5,
  defaultValue,
  filter = defaultFilter,
  onChange,
  onSubmit,
  focused = true,
  disabled = false,
}: AutocompleteProps<TValue>): ReactElement {
  const [search, setSearch] = useState('')
  const [focusIndex, setFocusIndex] = useState(resolveInitialIndex({ options, defaultValue }))
  const [cursorOffset, setCursorOffset] = useState(0)

  const filtered = useMemo(
    () => options.filter((option) => filter(search, option)),
    [options, search, filter]
  )

  useInput(
    (input, key) => {
      if (key.upArrow) {
        if (filtered.length === 0) {
          return
        }
        const clamped = Math.min(focusIndex, filtered.length - 1)
        const next = Math.max(0, clamped - 1)
        setFocusIndex(next)
        const focusedOption = filtered[next]
        if (onChange && focusedOption !== undefined) {
          onChange(focusedOption.value)
        }
        return
      }

      if (key.downArrow) {
        if (filtered.length === 0) {
          return
        }
        const next = Math.min(filtered.length - 1, focusIndex + 1)
        setFocusIndex(next)
        const focusedOption = filtered[next]
        if (onChange && focusedOption !== undefined) {
          onChange(focusedOption.value)
        }
        return
      }

      if (key.return) {
        const focusedOption = filtered[focusIndex]
        if (onSubmit && focusedOption !== undefined && !focusedOption.disabled) {
          onSubmit(focusedOption.value)
        }
        return
      }

      if (key.leftArrow) {
        setCursorOffset(Math.max(0, cursorOffset - 1))
        return
      }

      if (key.rightArrow) {
        setCursorOffset(Math.min(search.length, cursorOffset + 1))
        return
      }

      if (key.ctrl && input === 'd') {
        if (cursorOffset < search.length) {
          const nextSearch = removeCharAt({ str: search, index: cursorOffset })
          setSearch(nextSearch)
          setFocusIndex(0)
        }
        return
      }

      if (key.backspace) {
        if (cursorOffset > 0) {
          const nextSearch = removeCharAt({ str: search, index: cursorOffset - 1 })
          setSearch(nextSearch)
          setCursorOffset(cursorOffset - 1)
          setFocusIndex(0)
        }
        return
      }

      if (input && !key.ctrl && !key.meta) {
        const nextSearch = insertCharAt({ str: search, index: cursorOffset, chars: input })
        setSearch(nextSearch)
        setCursorOffset(cursorOffset + input.length)
        setFocusIndex(0)
      }
    },
    { isActive: focused && !disabled }
  )

  return (
    <Box flexDirection="column">
      <SearchInput
        value={search}
        placeholder={placeholder}
        disabled={disabled}
        cursorOffset={cursorOffset}
      />
      {match(filtered.length > 0)
        .with(true, () => (
          <ScrollArea height={Math.min(maxVisible, filtered.length)} activeIndex={focusIndex}>
            {filtered.map((option, index) => {
              const isFocused = index === focusIndex
              const indicator = match(isFocused)
                .with(true, () => symbols.radioOn)
                .with(false, () => symbols.radioOff)
                .exhaustive()

              return (
                <OptionRow
                  key={String(option.value)}
                  option={option}
                  indicator={indicator}
                  isFocused={isFocused}
                  isSelected={isFocused}
                  disabled={disabled}
                />
              )
            })}
          </ScrollArea>
        ))
        .with(false, () => <Text dimColor>No matches found.</Text>)
        .exhaustive()}
    </Box>
  )
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Props for the {@link SearchInput} component.
 *
 * @private
 */
interface SearchInputProps {
  readonly value: string
  readonly placeholder?: string
  readonly disabled: boolean
  readonly cursorOffset: number
}

/**
 * Default case-insensitive substring filter.
 *
 * @private
 * @param search - The current search string.
 * @param option - The option to test.
 * @returns Whether the option matches the search.
 */
function defaultFilter<TValue>(search: string, option: PromptOption<TValue>): boolean {
  if (search === '') {
    return true
  }
  return option.label.toLowerCase().includes(search.toLowerCase())
}

/**
 * Render the search text input with cursor and placeholder support.
 *
 * @private
 * @param props - The search input props.
 * @returns A rendered search input element.
 */
function SearchInput({
  value,
  placeholder,
  disabled,
  cursorOffset,
}: SearchInputProps): ReactElement {
  return (
    <Box>
      <Text color={colors.primary} bold>
        {'> '}
      </Text>
      {match({ isEmpty: value === '', hasPlaceholder: placeholder !== undefined })
        .with({ isEmpty: true, hasPlaceholder: true }, () => <Text dimColor>{placeholder}</Text>)
        .otherwise(() => (
          <CursorValue value={value} cursor={cursorOffset} disabled={disabled} />
        ))}
    </Box>
  )
}
