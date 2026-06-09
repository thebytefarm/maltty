import { Box, Text, useInput } from 'ink'
import picocolors from 'picocolors'
import type { ReactElement } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { match } from 'ts-pattern'

import { ErrorMessage } from '../display/error-message.js'
import { colors, symbols } from '../theme.js'
import type { PromptOption, PromptProps } from './types.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Props for the {@link GroupMultiSelect} component.
 */
export interface GroupMultiSelectProps<TValue> extends PromptProps {
  /** Options organized by group name. */
  readonly options: Readonly<Record<string, readonly PromptOption<TValue>[]>>

  /** Initially selected values. */
  readonly defaultValue?: readonly TValue[]

  /** When `true`, at least one option must be selected to submit. */
  readonly required?: boolean

  /** When `true`, group headers can be toggled to select/deselect all options in the group. */
  readonly selectableGroups?: boolean

  /** Called whenever the selection changes. */
  readonly onChange?: (value: readonly TValue[]) => void

  /** Called when the user presses Enter to confirm. */
  readonly onSubmit?: (value: readonly TValue[]) => void
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * Multi-select prompt with options organized into named groups.
 *
 * Renders group headers as bold section labels with indented options beneath.
 * Space toggles the focused item, Enter submits the current selection.
 * When `selectableGroups` is enabled, toggling a group header toggles all
 * of its child options.
 *
 * @param props - The group multi-select props.
 * @returns A rendered group multi-select element.
 */
export function GroupMultiSelect<TValue>({
  options,
  defaultValue = [],
  required = false,
  selectableGroups = false,
  onChange,
  onSubmit,
  focused = true,
  disabled = false,
}: GroupMultiSelectProps<TValue>): ReactElement {
  const flatItems = useMemo(
    () => buildFlatItems({ options, selectableGroups }),
    [options, selectableGroups]
  )
  const [focusIndex, setFocusIndex] = useState(0)
  const [selected, setSelected] = useState<readonly TValue[]>(defaultValue)
  const [error, setError] = useState<string | undefined>(undefined)
  const selectedSet = useMemo(() => new Set(selected), [selected])

  useEffect(() => {
    if (flatItems.length === 0) {
      return
    }
    if (focusIndex >= flatItems.length) {
      setFocusIndex(flatItems.length - 1)
    }
  }, [flatItems, focusIndex])

  useInput(
    (input, key) => {
      if (key.return) {
        if (required && selected.length === 0) {
          setError('At least one option must be selected.')
          return
        }
        if (onSubmit) {
          onSubmit(selected)
        }
        return
      }

      if (flatItems.length === 0) {
        return
      }

      if (key.upArrow) {
        setFocusIndex(moveFocus(focusIndex, -1, flatItems))
        return
      }

      if (key.downArrow) {
        setFocusIndex(moveFocus(focusIndex, 1, flatItems))
        return
      }

      if (input === ' ') {
        const item = flatItems[focusIndex]
        if (item === undefined) {
          return
        }
        const nextSelected = toggleItem({ item, selected, selectedSet, options })
        setSelected(nextSelected)
        setError(undefined)
        if (onChange) {
          onChange(nextSelected)
        }
      }
    },
    { isActive: focused && !disabled }
  )

  return (
    <Box flexDirection="column">
      {flatItems.map((item, index) => {
        const isFocused = index === focusIndex
        return (
          <FlatItemRow
            key={itemKey(item)}
            item={item}
            isFocused={isFocused}
            isSelected={isItemSelected(item, selectedSet, options)}
            disabled={disabled}
          />
        )
      })}
      <ErrorMessage message={error} />
    </Box>
  )
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * A flattened group header item.
 *
 * @private
 */
interface FlatGroupItem {
  readonly kind: 'group'
  readonly groupName: string
}

/**
 * A flattened option item within a group.
 *
 * @private
 */
interface FlatOptionItem<TValue = unknown> {
  readonly kind: 'option'
  readonly groupName: string
  readonly option: PromptOption<TValue>
}

/**
 * A flattened item that is either a group header or an option.
 *
 * @private
 */
type FlatItem<TValue = unknown> = FlatGroupItem | FlatOptionItem<TValue>

/**
 * Props for the {@link FlatItemRow} component.
 *
 * @private
 */
interface FlatItemRowProps {
  readonly item: FlatItem
  readonly isFocused: boolean
  readonly isSelected: boolean
  readonly disabled: boolean
}

/**
 * Options for building a flat item list.
 *
 * @private
 */
interface BuildFlatItemsOptions<TValue> {
  readonly options: Readonly<Record<string, readonly PromptOption<TValue>[]>>
  readonly selectableGroups: boolean
}

/**
 * Options for toggling a flat item's selection state.
 *
 * @private
 */
interface ToggleItemOptions<TValue> {
  readonly item: FlatItem<TValue>
  readonly selected: readonly TValue[]
  readonly selectedSet: ReadonlySet<TValue>
  readonly options: Readonly<Record<string, readonly PromptOption<TValue>[]>>
}

/**
 * Build a flat list of items from the grouped options map.
 *
 * @private
 * @param opts - The build options.
 * @returns A flat array of group headers and options.
 */
function buildFlatItems<TValue>({
  options,
  selectableGroups,
}: BuildFlatItemsOptions<TValue>): readonly FlatItem<TValue>[] {
  return Object.entries(options).flatMap(([groupName, groupOptions]) => {
    const header: FlatItem<TValue> = { kind: 'group', groupName }
    const items: readonly FlatItem<TValue>[] = groupOptions.map((option) => ({
      kind: 'option' as const,
      groupName,
      option,
    }))
    return match(selectableGroups)
      .with(true, () => [header, ...items])
      .with(false, () => items)
      .exhaustive()
  })
}

/**
 * Compute the next focus index, skipping disabled options.
 *
 * @private
 * @param current - The current focus index.
 * @param direction - The direction to move (-1 or 1).
 * @param items - The flat item list.
 * @returns The next valid focus index.
 */
function moveFocus(current: number, direction: number, items: readonly FlatItem[]): number {
  const next = current + direction
  if (next < 0 || next >= items.length) {
    return current
  }
  const item = items[next]
  if (item !== undefined && item.kind === 'option' && item.option.disabled) {
    const result = moveFocus(next, direction, items)
    return match(result === next)
      .with(true, () => current)
      .with(false, () => result)
      .exhaustive()
  }
  return next
}

/**
 * Toggle the selection state for a flat item. For group headers, toggles all
 * non-disabled options in the group. For options, toggles the single value.
 *
 * @private
 * @param opts - The toggle options.
 * @returns The updated selection array.
 */
function toggleItem<TValue>({
  item,
  selected,
  selectedSet,
  options,
}: ToggleItemOptions<TValue>): readonly TValue[] {
  return match(item.kind)
    .with('group', () => {
      const groupOptions = options[item.groupName] ?? []
      const enabledValues = groupOptions.filter((opt) => !opt.disabled).map((opt) => opt.value)
      const enabledSet = new Set(enabledValues)
      const allSelected = enabledValues.every((v) => selectedSet.has(v))
      return match(allSelected)
        .with(true, () => selected.filter((v) => !enabledSet.has(v)))
        .with(false, () => [...selected.filter((v) => !enabledSet.has(v)), ...enabledValues])
        .exhaustive()
    })
    .with('option', () => {
      if (item.kind !== 'option' || item.option.disabled) {
        return selected
      }
      const { value } = item.option
      return match(selectedSet.has(value))
        .with(true, () => selected.filter((v) => v !== value))
        .with(false, () => [...selected, value])
        .exhaustive()
    })
    .exhaustive()
}

/**
 * Determine whether a flat item is currently selected.
 *
 * @private
 * @param item - The flat item.
 * @param selectedSet - A set of currently selected values for O(1) lookup.
 * @param options - The grouped options.
 * @returns Whether the item is selected.
 */
function isItemSelected<TValue>(
  item: FlatItem<TValue>,
  selectedSet: ReadonlySet<TValue>,
  options: Readonly<Record<string, readonly PromptOption<TValue>[]>>
): boolean {
  return match(item.kind)
    .with('group', () => {
      const groupOptions = options[item.groupName] ?? []
      const enabledValues = groupOptions.filter((opt) => !opt.disabled).map((opt) => opt.value)
      return enabledValues.length > 0 && enabledValues.every((v) => selectedSet.has(v))
    })
    .with('option', () => item.kind === 'option' && selectedSet.has(item.option.value))
    .exhaustive()
}

/**
 * Generate a stable key for a flat item.
 *
 * @private
 * @param item - The flat item.
 * @param index - The item index.
 * @returns A string key.
 */
function itemKey(item: FlatItem): string {
  return match(item)
    .with({ kind: 'group' }, (i) => `group-${i.groupName}`)
    .with({ kind: 'option' }, (i) => `option-${i.groupName}-${String(i.option.value)}`)
    .exhaustive()
}

/**
 * Render a single row in the flat item list, either a group header
 * or an indented option with checkbox.
 *
 * @private
 * @param props - The row props.
 * @returns A rendered row element.
 */
function FlatItemRow({ item, isFocused, isSelected, disabled }: FlatItemRowProps): ReactElement {
  return match(item)
    .with({ kind: 'group' }, (groupItem) => (
      <Box>
        <Text bold dimColor={disabled}>
          {match(isFocused)
            .with(true, () => `${symbols.pointer} `)
            .with(false, () => '  ')
            .exhaustive()}
          {match(isSelected)
            .with(true, () => `${symbols.checkboxOn} `)
            .with(false, () => `${symbols.checkboxOff} `)
            .exhaustive()}
          {groupItem.groupName}
        </Text>
      </Box>
    ))
    .with({ kind: 'option' }, (optionItem) => {
      const { option } = optionItem
      const isOptionDisabled = disabled || (option.disabled ?? false)
      return (
        <Box paddingLeft={2}>
          <Text
            color={match({ isFocused, isOptionDisabled })
              .with({ isOptionDisabled: true }, () => 'gray' as const)
              .with({ isFocused: true }, () => colors.primary)
              .otherwise(() => undefined)}
          >
            {match(isFocused)
              .with(true, () => `${symbols.pointer} `)
              .with(false, () => '  ')
              .exhaustive()}
            {match(isSelected)
              .with(true, () => `${symbols.checkboxOn} `)
              .with(false, () => `${symbols.checkboxOff} `)
              .exhaustive()}
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
                {' '}
                {hint}
              </Text>
            ))}
        </Box>
      )
    })
    .exhaustive()
}
