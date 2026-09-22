import { useInput } from 'ink'
import type { ReactElement, ReactNode } from 'react'
import React, { createContext, useContext, useEffect, useLayoutEffect, useReducer } from 'react'

import type { InteractionController } from './controller.js'
import { parseSgrMouse } from './sgr-mouse.js'

const InteractionContext = createContext<InteractionController | null>(null)

/**
 * Props for the internal interaction runtime provider.
 */
export interface InteractionRuntimeProps {
  readonly children: ReactNode
  readonly controller: InteractionController
}

/**
 * Connect an interaction controller to Ink input and React frame scheduling.
 *
 * @param props - Runtime controller and child tree.
 * @returns The interaction context provider.
 */
export function InteractionRuntime({
  children,
  controller,
}: InteractionRuntimeProps): ReactElement {
  const [, requestFrame] = useReducer((generation: number) => generation + 1, 0)

  useLayoutEffect(() => controller.connectFrameRequest(requestFrame), [controller, requestFrame])

  useEffect(() => {
    controller.enable()
    return controller.disable
  }, [controller])

  useInput((input) => {
    const [event, error] = parseSgrMouse(input)
    if (error === null) {
      controller.handleMouse(event)
    }
  })

  return <InteractionContext.Provider value={controller}>{children}</InteractionContext.Provider>
}

/**
 * Read the optional interaction controller for a pressable node.
 *
 * @returns The active controller, or `null` under ordinary Ink rendering.
 */
export function useInteractionController(): InteractionController | null {
  return useContext(InteractionContext)
}
