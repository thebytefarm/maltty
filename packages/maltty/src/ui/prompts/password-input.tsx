import { Box, Text, useInput } from 'ink'
import type { ReactElement } from 'react'
import { useState } from 'react'
import { match } from 'ts-pattern'

import { ErrorMessage } from '../display/error-message.js'
import { CursorValue } from './cursor-value.js'
import type { InputState } from './input-state.js'
import { resolveNextState } from './input-state.js'
import type { PromptProps } from './types.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Props for the {@link PasswordInput} component.
 */
export interface PasswordInputProps extends PromptProps {
  /** Placeholder text shown dimmed when the input is empty. */
  readonly placeholder?: string

  /** The mask character used to hide input. @default "*" */
  readonly mask?: string

  /** Validation function. Return an error message string to show, or undefined if valid. */
  readonly validate?: (value: string) => string | undefined

  /** Callback fired when the input value changes. */
  readonly onChange?: (value: string) => void

  /** Callback fired when the value is submitted via Enter. */
  readonly onSubmit?: (value: string) => void
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * A masked single-line text input prompt with cursor movement and validation.
 *
 * Renders the current value with each character replaced by the mask
 * character. Shows a visible cursor (inverse character) at the current
 * position. Placeholder text is shown dimmed when the input is empty.
 * Validation errors appear below the input in red.
 *
 * **Keyboard shortcuts:**
 * - Left/Right arrows — move cursor
 * - Home (Ctrl+A) / End (Ctrl+E) — jump to start/end
 * - Backspace — delete character before cursor
 * - Delete (Ctrl+D) — delete character at cursor
 * - Enter — validate and submit
 *
 * @param props - The password input component props.
 * @returns A rendered password input element.
 */
export function PasswordInput({
  placeholder,
  mask = '*',
  validate,
  onChange,
  onSubmit,
  focused = true,
  disabled = false,
}: PasswordInputProps): ReactElement {
  const [state, setState] = useState<InputState>({
    value: '',
    cursor: 0,
    error: undefined,
  })

  useInput(
    (input, key) => {
      if (key.return) {
        const validationError = match(validate)
          .with(undefined, () => undefined)
          .otherwise((fn) => fn(state.value))
        if (validationError) {
          setState({ ...state, error: validationError })
          return
        }
        setState({ ...state, error: undefined })
        if (onSubmit) {
          onSubmit(state.value)
        }
        return
      }

      const nextState = resolveNextState({ state, input, key })
      if (nextState.value !== state.value || nextState.cursor !== state.cursor) {
        setState(nextState)
        if (nextState.value !== state.value && onChange) {
          onChange(nextState.value)
        }
      }
    },
    { isActive: focused && !disabled }
  )

  const maskedValue = mask.repeat(state.value.length)

  return (
    <Box flexDirection="column">
      {match(state.value.length === 0 && placeholder !== undefined)
        .with(true, () => <Text dimColor>{placeholder}</Text>)
        .with(false, () => (
          <CursorValue value={maskedValue} cursor={state.cursor} disabled={disabled} />
        ))
        .exhaustive()}
      <ErrorMessage message={state.error} />
    </Box>
  )
}
