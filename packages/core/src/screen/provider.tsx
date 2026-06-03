import type { ReactElement, ReactNode } from 'react'
import { createContext, useContext } from 'react'

import type { ScreenContext } from '../context/types.js'

const MalttyContext = createContext<ScreenContext | null>(null)

/**
 * Props for the {@link MalttyProvider} component.
 *
 * @private
 */
export interface MalttyProviderProps {
  readonly children: ReactNode
  readonly value: ScreenContext
}

/**
 * Provider that injects the maltty screen context into the React tree.
 * Screens rendered by the maltty runtime are automatically wrapped in
 * this provider.
 *
 * @private
 * @param props - Provider props containing the context value and children.
 * @returns A React element wrapping children with the maltty context.
 */
export function MalttyProvider({ children, value }: MalttyProviderProps): ReactElement {
  return <MalttyContext.Provider value={value}>{children}</MalttyContext.Provider>
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Access the command context from within a screen component.
 *
 * Returns a {@link ScreenContext} containing data properties (`args`,
 * `config`, `meta`, `store`), React-backed I/O (`log`, `spinner`),
 * and middleware-decorated properties (`auth`, `http`, `report`, etc.).
 *
 * `log` and `spinner` are automatically swapped with screen-safe
 * implementations that render through the `<Output />` component.
 * Middleware properties like `report` are also swapped when present.
 *
 * @returns The current screen context.
 */
export function useScreenContext<TContext extends ScreenContext = ScreenContext>(): TContext {
  const ctx = useContext(MalttyContext)
  if (!ctx) {
    throw new Error('useScreenContext must be used inside a screen() component')
  }
  return ctx as TContext
}
