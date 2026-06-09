import { Text } from 'ink'
import type { ReactElement } from 'react'
import { match } from 'ts-pattern'

import { colors } from '../theme.js'

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * Props for the {@link ErrorMessage} component.
 */
export interface ErrorMessageProps {
  /** The error message to display. When `undefined`, renders nothing. */
  readonly message: string | undefined
}

/**
 * Render a validation error message in red, or nothing when absent.
 *
 * @param props - The error message props.
 * @returns A rendered error text element, or `null`.
 */
export function ErrorMessage({ message }: ErrorMessageProps): ReactElement | null {
  return match(message)
    .with(undefined, () => null)
    .otherwise((msg) => <Text color={colors.error}>{msg}</Text>)
}
