// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Internal state for a text-based input component.
 */
export interface InputState {
  readonly value: string
  readonly cursor: number
  readonly error: string | undefined
}

/**
 * Input key descriptor used for state resolution.
 */
export interface KeyDescriptor {
  readonly leftArrow: boolean
  readonly rightArrow: boolean
  readonly backspace: boolean
  readonly delete: boolean
  readonly return: boolean
  readonly meta: boolean
  readonly ctrl: boolean
}

/**
 * Options for resolving the next input state.
 */
export interface ResolveStateOptions {
  readonly state: InputState
  readonly input: string
  readonly key: KeyDescriptor
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * Compute the next input state from a keyboard event.
 *
 * Handles cursor movement (left/right, home/end), character deletion
 * (backspace, Ctrl+D for forward-delete), and character insertion.
 *
 * Backspace removes the character before the cursor.
 * Forward-delete uses Ctrl+D.
 *
 * @param options - The state resolution options.
 * @returns The next input state.
 */
export function resolveNextState({ state, input, key }: ResolveStateOptions): InputState {
  if (key.leftArrow) {
    return { ...state, cursor: Math.max(0, state.cursor - 1) }
  }

  if (key.rightArrow) {
    return { ...state, cursor: Math.min(state.value.length, state.cursor + 1) }
  }

  if (key.ctrl && input === 'a') {
    return { ...state, cursor: 0 }
  }

  if (key.ctrl && input === 'e') {
    return { ...state, cursor: state.value.length }
  }

  if (key.ctrl && input === 'd') {
    if (state.cursor >= state.value.length) {
      return state
    }
    const nextValue = state.value.slice(0, state.cursor) + state.value.slice(state.cursor + 1)
    return { ...state, value: nextValue, error: undefined }
  }

  if (key.backspace) {
    if (state.cursor === 0) {
      return state
    }
    const nextValue = state.value.slice(0, state.cursor - 1) + state.value.slice(state.cursor)
    return { ...state, value: nextValue, cursor: state.cursor - 1, error: undefined }
  }

  if (key.ctrl || key.meta) {
    return state
  }

  if (input.length === 0 || key.return) {
    return state
  }

  const nextValue = state.value.slice(0, state.cursor) + input + state.value.slice(state.cursor)
  return { ...state, value: nextValue, cursor: state.cursor + input.length, error: undefined }
}
