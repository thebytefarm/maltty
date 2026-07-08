import { Text } from 'ink'
import type { ReactElement } from 'react'
import { match } from 'ts-pattern'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Props for the {@link CursorValue} component.
 */
export interface CursorValueProps {
  /** The display string (plain text or masked). */
  readonly value: string

  /** The cursor position within the value string. */
  readonly cursor: number

  /** When `true`, the value is rendered dimmed. */
  readonly disabled: boolean
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * Render a string with a visible cursor at the specified position.
 *
 * The character at the cursor position is rendered with inverse styling.
 * If the cursor is at the end, an inverse space is appended.
 *
 * @param props - The cursor value props.
 * @returns A rendered value element with cursor.
 */
export function CursorValue({ value, cursor, disabled }: CursorValueProps): ReactElement {
  const beforeCursor = value.slice(0, cursor)
  const atCursor = value[cursor]
  const afterCursor = value.slice(cursor + 1)

  return (
    <Text dimColor={disabled}>
      {beforeCursor}
      <Text inverse>
        {match(atCursor)
          .with(undefined, () => ' ')
          .otherwise((ch) => ch)}
      </Text>
      {afterCursor}
    </Text>
  )
}
