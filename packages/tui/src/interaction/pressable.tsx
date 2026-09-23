import type { BoxProps, DOMElement } from 'ink'
import { Box } from 'ink'
import type { ReactElement } from 'react'
import React, { useCallback, useId, useLayoutEffect } from 'react'

import { useInteractionController } from './context.js'
import type { InteractionClickEvent } from './controller.js'

/**
 * Props for a box that can receive terminal pointer clicks when interaction is enabled.
 */
export type PressableProps = BoxProps & {
  readonly disabled?: boolean
  readonly onClick?: (event: InteractionClickEvent) => void
}

/**
 * Render an Ink box that participates in an opt-in interactive render root.
 *
 * Under ordinary Ink rendering this behaves exactly like `Box`; `onClick` is
 * inert until the tree is mounted with {@link renderInteractive}.
 *
 * @param props - Box layout props and an optional click handler.
 * @returns A box registered with the nearest interactive render root.
 */
export function Pressable({
  'aria-role': ariaRole = 'button',
  'aria-state': ariaState,
  disabled = false,
  onClick,
  ...boxProps
}: PressableProps): ReactElement {
  const controller = useInteractionController()
  const id = useId()
  const registerElement = useCallback(
    (element: DOMElement | null): void => {
      controller?.registerElement({ element, id })
    },
    [controller, id]
  )

  useLayoutEffect(() => {
    controller?.configure({ disabled, id, onClick })
  })

  useLayoutEffect(() => {
    controller?.requestFrame()
  }, [controller, disabled])

  return (
    <Box
      {...boxProps}
      ref={registerElement}
      aria-role={ariaRole}
      aria-state={{ ...ariaState, disabled }}
    />
  )
}
