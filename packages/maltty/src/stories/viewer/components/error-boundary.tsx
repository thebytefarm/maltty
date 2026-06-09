/* oxlint-disable functional/no-classes, functional/no-this-expressions -- React requires a class for error boundaries */

import { Box, Text } from 'ink'
import type { ErrorInfo, ReactNode } from 'react'
import { Component } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Props for the {@link ErrorBoundary} component.
 */
interface ErrorBoundaryProps {
  readonly children: ReactNode
}

/**
 * Internal state for the {@link ErrorBoundary} component.
 */
interface ErrorBoundaryState {
  readonly error: Error | null
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * Catch rendering errors in child components and display a fallback error
 * message. This is the single allowed class component in the codebase
 * because React does not provide a functional error boundary API.
 *
 * @remarks
 * React mandates class components for error boundaries. This is the only
 * exception to the "no classes" rule.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  override componentDidCatch(_error: Error, _info: ErrorInfo): void {
    // Intentionally empty — error captured in state via getDerivedStateFromError
  }

  override render(): ReactNode {
    if (this.state.error) {
      return (
        <Box flexDirection="column" padding={1}>
          <Text color="red" bold>
            Render Error
          </Text>
          <Text color="red">{this.state.error.message}</Text>
        </Box>
      )
    }
    return this.props.children
  }
}
