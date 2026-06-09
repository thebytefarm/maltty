import { Box, Text } from 'ink'
import type { ReactElement } from 'react'
import { match } from 'ts-pattern'

import { Confirm } from '../../../ui/prompts/confirm.js'
import { MultiSelect } from '../../../ui/prompts/multi-select.js'
import { Select } from '../../../ui/prompts/select.js'
import { TextInput } from '../../../ui/prompts/text-input.js'
import type { PromptOption } from '../../../ui/prompts/types.js'
import type { FieldControlKind } from '../../types.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Props for the {@link FieldControl} component.
 */
interface FieldControlProps {
  readonly control: FieldControlKind
  readonly value: unknown
  readonly options?: readonly string[]
  readonly onChange: (value: unknown) => void
  readonly isFocused: boolean
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * Dispatch to the appropriate input control based on the field control kind.
 * Renders text inputs, selects, toggles, or read-only displays depending
 * on the schema-derived control type.
 *
 * @param props - The field control props.
 * @returns A rendered field control element.
 */
export function FieldControl({
  control,
  value,
  options,
  onChange,
  isFocused,
}: FieldControlProps): ReactElement {
  return match(control)
    .with('text', () => (
      <TextInput
        defaultValue={valueToString(value)}
        focused={isFocused}
        onSubmit={(submitted) => onChange(submitted)}
      />
    ))
    .with('number', () => (
      <TextInput
        defaultValue={valueToString(value)}
        focused={isFocused}
        onSubmit={(submitted) => onChange(parseNumericValue(submitted))}
      />
    ))
    .with('boolean', () => (
      <Confirm
        defaultValue={match(value)
          .with(true, () => true)
          .otherwise(() => false)}
        focused={isFocused}
        onSubmit={(submitted) => onChange(submitted)}
      />
    ))
    .with('select', () => {
      const selectOptions = buildSelectOptions(options)
      return (
        <Select
          focused={isFocused}
          options={selectOptions}
          onChange={(selected) => onChange(selected)}
        />
      )
    })
    .with('multiselect', () => {
      const selectOptions = buildSelectOptions(options)
      const defaultSelected = toStringArray(value)
      return (
        <Box flexDirection="column">
          <MultiSelect
            focused={isFocused}
            options={selectOptions}
            defaultValue={defaultSelected}
            onSubmit={(selectedValues) => onChange(selectedValues)}
          />
          <Text dimColor>(current: {JSON.stringify(value)})</Text>
        </Box>
      )
    })
    .with('json', () => (
      <TextInput
        defaultValue={stringifyJsonValue(value)}
        focused={isFocused}
        onSubmit={(submitted) => onChange(parseJsonValue(submitted))}
      />
    ))
    .with('readonly', () => <Text dimColor>{valueToDisplay(value)}</Text>)
    .exhaustive()
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Convert a value to a string for use as a text input default. Returns
 * an empty string for null and undefined values.
 *
 * @private
 * @param value - The value to convert.
 * @returns The string representation.
 */
function valueToString(value: unknown): string {
  if (value === null || value === undefined) {
    return ''
  }
  return String(value)
}

/**
 * Convert a value to a display string, using 'N/A' for null and
 * undefined values.
 *
 * @private
 * @param value - The value to convert.
 * @returns The display string.
 */
function valueToDisplay(value: unknown): string {
  if (value === null || value === undefined) {
    return 'N/A'
  }
  return String(value)
}

/**
 * Parse a string as a numeric value, falling back to 0 for invalid input.
 *
 * @private
 * @param input - The string to parse.
 * @returns The parsed number.
 */
function parseNumericValue(input: string): number {
  const parsed = Number(input)
  if (Number.isNaN(parsed)) {
    return 0
  }
  return parsed
}

/**
 * Build select-compatible option objects from a list of string values.
 *
 * @private
 * @param options - The raw string options.
 * @returns An array of label/value option objects.
 */
function buildSelectOptions(
  options: readonly string[] | undefined
): readonly PromptOption<string>[] {
  if (options === undefined) {
    return []
  }
  return options.map((opt) => ({ label: opt, value: opt }))
}

/**
 * Coerce a value into a string array. Returns an empty array when
 * the value is not an array.
 *
 * @private
 * @param value - The value to coerce.
 * @returns A string array.
 */
function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(String)
  }
  return []
}

/**
 * Safely stringify a value as JSON for display in a text input.
 *
 * @private
 * @param value - The value to stringify.
 * @returns The JSON string representation.
 */
function stringifyJsonValue(value: unknown): string {
  if (value === null || value === undefined) {
    return ''
  }
  if (typeof value === 'string') {
    return value
  }
  return JSON.stringify(value)
}

/**
 * Parse a JSON string, falling back to the raw string on parse failure.
 *
 * @private
 * @param input - The string to parse.
 * @returns The parsed value or the raw string.
 */
function parseJsonValue(input: string): unknown {
  try {
    return JSON.parse(input) as unknown
  } catch {
    return input
  }
}
