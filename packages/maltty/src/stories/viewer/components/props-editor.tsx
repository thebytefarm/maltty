import { Box, Text } from 'ink'
import type { ReactElement } from 'react'
import { match } from 'ts-pattern'

import type { TabItem } from '../../../ui/layout/tabs.js'
import { Tabs } from '../../../ui/layout/tabs.js'
import type { FieldControlKind, FieldDescriptor } from '../../types.js'
import type { FieldError } from '../../validate.js'
import { FieldControl } from './field-control.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Props for the {@link PropsEditor} component.
 */
interface PropsEditorProps {
  readonly fields: readonly FieldDescriptor[]
  readonly values: Record<string, unknown>
  readonly errors: readonly FieldError[]
  readonly onChange: (name: string, value: unknown) => void
  readonly isFocused: boolean
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Custom dotted border style for the props editor inset.
 *
 * @private
 */
const DOTTED_BORDER = {
  topLeft: ' ',
  top: '┄',
  topRight: ' ',
  right: ' ',
  bottomRight: ' ',
  bottom: ' ',
  bottomLeft: ' ',
  left: ' ',
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * Inline form editor for story props. Renders inside the preview panel
 * with a dotted border to visually separate it from the component preview.
 * When there are 2 or more fields, each field is shown in its own tab
 * to avoid key conflicts. A single field renders inline without tabs.
 *
 * @param props - The props editor props.
 * @returns A rendered props editor element.
 */
export function PropsEditor({
  fields,
  values,
  errors,
  onChange,
  isFocused,
}: PropsEditorProps): ReactElement {
  if (fields.length === 0) {
    return (
      <Box
        marginTop={1}
        borderStyle={DOTTED_BORDER}
        borderDimColor
        borderTop
        borderBottom={false}
        borderLeft={false}
        borderRight={false}
        paddingX={1}
      >
        <Text bold dimColor>
          Props
        </Text>
        <Text dimColor> — none</Text>
      </Box>
    )
  }

  if (fields.length === 1) {
    return (
      <SingleFieldEditor
        field={fields[0] as FieldDescriptor}
        values={values}
        errors={errors}
        onChange={onChange}
        isFocused={isFocused}
      />
    )
  }

  return (
    <TabbedFieldEditor
      fields={fields}
      values={values}
      errors={errors}
      onChange={onChange}
      isFocused={isFocused}
    />
  )
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Props shared by both single and tabbed field editors.
 *
 * @private
 */
interface FieldEditorProps {
  readonly values: Record<string, unknown>
  readonly errors: readonly FieldError[]
  readonly onChange: (name: string, value: unknown) => void
  readonly isFocused: boolean
}

/**
 * Render a single field inline without tabs.
 *
 * @private
 * @param props - The single field editor props.
 * @returns A rendered single field editor element.
 */
function SingleFieldEditor({
  field,
  values,
  errors,
  onChange,
  isFocused,
}: FieldEditorProps & { readonly field: FieldDescriptor }): ReactElement {
  const fieldError = findFieldError(errors, field.name)

  return (
    <Box
      flexDirection="column"
      marginTop={1}
      borderStyle={DOTTED_BORDER}
      borderDimColor
      borderTop
      borderBottom={false}
      borderLeft={false}
      borderRight={false}
      paddingX={1}
    >
      <Box marginBottom={1}>
        <Text bold>Props</Text>
      </Box>
      <Box flexDirection="column">
        <Box gap={1}>
          <Box width={16}>
            <Text bold={isFocused} color={resolveFieldColor(isFocused)}>
              {field.name}
              {requiredMarker(field.isOptional)}
            </Text>
          </Box>
          <FieldControl
            control={field.control}
            value={values[field.name]}
            options={field.options as readonly string[] | undefined}
            onChange={(value: unknown) => onChange(field.name, value)}
            isFocused={isFocused}
          />
        </Box>
        <FieldErrorMessage error={fieldError} />
        <SubmitHint control={field.control} isFocused={isFocused} />
      </Box>
    </Box>
  )
}

/**
 * Render fields as tabs, one field per tab.
 *
 * @private
 * @param props - The tabbed field editor props.
 * @returns A rendered tabbed field editor element.
 */
function TabbedFieldEditor({
  fields,
  values,
  errors,
  onChange,
  isFocused,
}: FieldEditorProps & { readonly fields: readonly FieldDescriptor[] }): ReactElement {
  const tabs: readonly TabItem[] = fields.map((field) => ({
    label: field.name,
    content: (
      <FieldTab
        field={field}
        values={values}
        errors={errors}
        onChange={onChange}
        isFocused={isFocused}
      />
    ),
  }))

  return (
    <Box
      flexDirection="column"
      marginTop={1}
      borderStyle={DOTTED_BORDER}
      borderDimColor
      borderTop
      borderBottom={false}
      borderLeft={false}
      borderRight={false}
      paddingX={1}
    >
      <Box marginBottom={1}>
        <Text bold>Props</Text>
      </Box>
      <Tabs tabs={tabs} isFocused={isFocused} />
    </Box>
  )
}

/**
 * Content for a single field tab. Renders the field control with its
 * label and any validation error.
 *
 * @private
 * @param props - The field tab props.
 * @returns A rendered field tab content element.
 */
function FieldTab({
  field,
  values,
  errors,
  onChange,
  isFocused,
}: FieldEditorProps & { readonly field: FieldDescriptor }): ReactElement {
  const fieldError = findFieldError(errors, field.name)

  return (
    <Box flexDirection="column" paddingTop={1}>
      <Box gap={1}>
        <Text dimColor>type:</Text>
        <Text>{field.zodTypeName}</Text>
        {match(field.isOptional)
          .with(true, () => <Text dimColor> (optional)</Text>)
          .with(false, () => (
            <Text color="red" dimColor>
              {' '}
              (required)
            </Text>
          ))
          .exhaustive()}
      </Box>
      <FieldDescription description={field.description} />
      <Box gap={1} marginTop={1}>
        <Text bold={isFocused} color={resolveFieldColor(isFocused)}>
          value:
        </Text>
        <FieldControl
          control={field.control}
          value={values[field.name]}
          options={field.options as readonly string[] | undefined}
          onChange={(value: unknown) => onChange(field.name, value)}
          isFocused={isFocused}
        />
      </Box>
      <FieldErrorMessage error={fieldError} />
      <SubmitHint control={field.control} isFocused={isFocused} />
    </Box>
  )
}

/**
 * Render a dimmed submit hint below the field control. Shows a
 * context-appropriate message based on the control type. Hidden
 * when the field is not focused or the control is read-only.
 *
 * @private
 * @param props - The component props.
 * @returns A rendered hint element or null.
 */
function SubmitHint({
  control,
  isFocused,
}: {
  readonly control: FieldControlKind
  readonly isFocused: boolean
}): ReactElement | null {
  if (!isFocused) {
    return null
  }

  const hint = resolveSubmitHint(control)
  if (hint === null) {
    return null
  }

  return (
    <Box marginTop={1}>
      <Text dimColor>{hint}</Text>
    </Box>
  )
}

/**
 * Resolve the submit hint text for a given control kind.
 *
 * @private
 * @param control - The field control kind.
 * @returns The hint string, or null for controls that don't need one.
 */
function resolveSubmitHint(control: FieldControlKind): string | null {
  return match(control)
    .with('text', () => 'press enter to submit')
    .with('number', () => 'press enter to submit')
    .with('json', () => 'press enter to submit')
    .with('boolean', () => 'y to confirm, n to cancel')
    .with('select', () => 'use ↑↓ to choose, enter to select')
    .with('multiselect', () => 'use ↑↓ to navigate, space to toggle, enter to submit')
    .with('readonly', () => null)
    .exhaustive()
}

/**
 * Render a field description when available, or nothing when absent.
 *
 * @private
 * @param props - The component props.
 * @returns A rendered description element or null.
 */
function FieldDescription({
  description,
}: {
  readonly description: string | undefined
}): ReactElement | null {
  if (description === undefined) {
    return null
  }
  return (
    <Box gap={1}>
      <Text dimColor>desc:</Text>
      <Text dimColor italic>
        {description}
      </Text>
    </Box>
  )
}

/**
 * Resolve the color for a field label based on focus state.
 *
 * @private
 * @param isFocused - Whether the field is focused.
 * @returns The color string, or undefined for default.
 */
function resolveFieldColor(isFocused: boolean): string | undefined {
  return match(isFocused)
    .with(true, () => 'cyan' as const)
    .with(false, () => undefined)
    .exhaustive()
}

/**
 * Return the required marker suffix for a field label.
 *
 * @private
 * @param isOptional - Whether the field is optional.
 * @returns An empty string for optional fields, '*' for required fields.
 */
function requiredMarker(isOptional: boolean): string {
  if (isOptional) {
    return ''
  }
  return '*'
}

/**
 * Render a field error message, or nothing when no error exists.
 *
 * @private
 * @param props - The component props.
 * @returns A rendered error message or null.
 */
function FieldErrorMessage({ error }: { readonly error: FieldError | null }): ReactElement | null {
  if (error === null) {
    return null
  }
  return (
    <Box paddingLeft={2}>
      <Text color="red">{error.message}</Text>
    </Box>
  )
}

/**
 * Find the first error matching a given field name. Matches both exact field
 * names and nested dot-path errors (e.g. `meta.nested` or `tags.0`) that
 * belong to the owning field.
 *
 * @private
 * @param errors - The array of field errors.
 * @param fieldName - The field name to search for.
 * @returns The matching error, or null if none found.
 */
function findFieldError(errors: readonly FieldError[], fieldName: string): FieldError | null {
  const found = errors.find(
    (error) => error.field === fieldName || error.field.startsWith(`${fieldName}.`)
  )
  if (found === undefined) {
    return null
  }
  return found
}
