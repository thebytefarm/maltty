import type { DOMElement } from 'ink'
import { measureElement } from 'ink'
import { match } from 'ts-pattern'

import type { InteractionClip, InteractionPoint, InteractionTarget } from './hit-testing.js'
import {
  createInteractionHitGrid,
  createInteractionHitGridStore,
  toSurfacePoint,
} from './hit-testing.js'
import { createMouseModeLifecycle } from './mouse-mode.js'
import type { SgrMouseButton, SgrMouseEvent } from './sgr-mouse.js'

/**
 * Event delivered after a pointer press and release resolve to the same target.
 */
export interface InteractionClickEvent {
  readonly button: SgrMouseButton
  readonly localX: number
  readonly localY: number
  readonly modifiers: SgrMouseEvent['modifiers']
  readonly targetId: string
  readonly viewportX: number
  readonly viewportY: number
}

/**
 * Mutable renderer boundary shared by the interactive root and pressable nodes.
 */
export interface InteractionController {
  readonly commitFrame: () => void
  readonly configure: (options: ConfigureInteractionTargetOptions) => void
  readonly connectFrameRequest: (requestFrame: () => void) => () => void
  readonly disable: () => void
  readonly enable: () => void
  readonly handleMouse: (event: SgrMouseEvent) => void
  readonly registerElement: (options: RegisterInteractionElementOptions) => void
  readonly requestFrame: () => void
}

/**
 * Configuration updated after each committed pressable render.
 */
export interface ConfigureInteractionTargetOptions {
  readonly disabled: boolean
  readonly id: string
  readonly onClick?: (event: InteractionClickEvent) => void
}

/**
 * Ref update connecting an Ink host element to an interaction target.
 */
export interface RegisterInteractionElementOptions {
  readonly element: DOMElement | null
  readonly id: string
}

interface CreateInteractionControllerOptions {
  readonly height: () => number
  readonly origin: InteractionPoint
  readonly width: () => number
  readonly write: (data: string) => void
}

interface TargetConfiguration {
  readonly disabled: boolean
  readonly onClick?: (event: InteractionClickEvent) => void
}

/**
 * Create the stateful boundary that publishes frames and dispatches clicks.
 *
 * @param options - Terminal dimensions, origin, and output writer.
 * @returns An interaction controller scoped to one Ink render root.
 */
export function createInteractionController({
  height,
  origin,
  width,
  write,
}: CreateInteractionControllerOptions): InteractionController {
  const elements = new Map<string, DOMElement>()
  const configurations = new Map<string, TargetConfiguration>()
  const frameRequests = new Set<() => void>()
  const pressedTargets = new Map<SgrMouseButton, string>()
  const hitGrid = createInteractionHitGridStore({
    frame: createInteractionHitGrid({ height: 0, targets: [], width: 0 }),
  })
  const mouseMode = createMouseModeLifecycle({ write })

  function requestFrame(): void {
    ;[...frameRequests].map((request) => request())
  }

  function configure({ disabled, id, onClick }: ConfigureInteractionTargetOptions): void {
    configurations.set(id, Object.freeze({ disabled, onClick }))
  }

  function registerElement({ element, id }: RegisterInteractionElementOptions): void {
    match(element)
      .with(null, () => {
        elements.delete(id)
        configurations.delete(id)
      })
      .otherwise((value) => elements.set(id, value))
    requestFrame()
  }

  function connectFrameRequest(request: () => void): () => void {
    frameRequests.add(request)
    request()
    return () => {
      frameRequests.delete(request)
    }
  }

  function commitFrame(): void {
    const targets = [...elements.entries()]
      .toSorted(([, left], [, right]) => comparePaintOrder({ left, right }))
      .map<InteractionTarget>(([id, element]) => {
        const configuration = configurations.get(id)
        return Object.freeze({
          clips: getInteractionClips(element),
          disabled: configuration?.disabled ?? false,
          id,
          rect: Object.freeze(measureElement(element)),
        })
      })

    hitGrid.commit(createInteractionHitGrid({ height: height(), targets, width: width() }))
  }

  function dispatchClick({
    event,
    target,
  }: {
    event: SgrMouseEvent
    target: InteractionTarget
  }): void {
    configurations.get(target.id)?.onClick?.(
      Object.freeze({
        button: event.button,
        localX: event.x - origin.x - target.rect.x,
        localY: event.y - origin.y - target.rect.y,
        modifiers: event.modifiers,
        targetId: target.id,
        viewportX: event.x,
        viewportY: event.y,
      })
    )
  }

  function handleMouse(event: SgrMouseEvent): void {
    const point = toSurfacePoint({ origin, point: event })
    const target = hitGrid.resolve(point)

    match(event.type)
      .with('down', () => {
        match(target)
          .with(null, () => pressedTargets.delete(event.button))
          .otherwise((value) => pressedTargets.set(event.button, value.id))
      })
      .with('up', () => {
        const pressedTargetId = pressedTargets.get(event.button)
        pressedTargets.delete(event.button)
        if (target !== null && target.id === pressedTargetId) {
          dispatchClick({ event, target })
        }
      })
      .otherwise(() => undefined)
  }

  function enable(): void {
    mouseMode.registerCleanup()
    mouseMode.enable()
  }

  function disable(): void {
    mouseMode.unregisterCleanup()
    mouseMode.disable()
  }

  return Object.freeze({
    commitFrame,
    configure,
    connectFrameRequest,
    disable,
    enable,
    handleMouse,
    registerElement,
    requestFrame,
  })
}

function comparePaintOrder({ left, right }: { left: DOMElement; right: DOMElement }): number {
  const leftPath = getPaintPath(left)
  const rightPath = getPaintPath(right)
  const differenceIndex = Array.from(
    { length: Math.max(leftPath.length, rightPath.length) },
    (_, index) => index
  ).find((index) => leftPath[index] !== rightPath[index])

  return match(differenceIndex)
    .with(undefined, () => 0)
    .otherwise((index) => (leftPath[index] ?? -1) - (rightPath[index] ?? -1))
}

function getPaintPath(element: DOMElement): readonly number[] {
  const parent = element.parentNode
  return match(parent)
    .with(undefined, () => [])
    .otherwise((value) => [...getPaintPath(value), value.childNodes.indexOf(element)])
}

function getInteractionClips(element: DOMElement): readonly InteractionClip[] {
  const parent = element.parentNode
  return match(parent)
    .with(undefined, () => [])
    .otherwise((value) => {
      const clips = getInteractionClips(value)
      const horizontal = value.style.overflow === 'hidden' || value.style.overflowX === 'hidden'
      const vertical = value.style.overflow === 'hidden' || value.style.overflowY === 'hidden'

      return match({ horizontal, vertical })
        .with({ horizontal: false, vertical: false }, () => clips)
        .otherwise(() => [
          ...clips,
          Object.freeze({
            horizontal,
            rect: getClipRect({ element: value, horizontal, vertical }),
            vertical,
          }),
        ])
    })
}

/**
 * Inset clipped axes by Ink's one-cell borders to match rendered child output.
 *
 * @private
 * @param options - Ancestor element and axes with overflow clipping enabled.
 * @returns The visible child-output rectangle used by Ink's renderer.
 */
function getClipRect({
  element,
  horizontal,
  vertical,
}: {
  readonly element: DOMElement
  readonly horizontal: boolean
  readonly vertical: boolean
}): InteractionTarget['rect'] {
  const rect = measureElement(element)
  const hasBorder = element.style.borderStyle !== undefined
  const left = Number(hasBorder && element.style.borderLeft !== false)
  const right = Number(hasBorder && element.style.borderRight !== false)
  const top = Number(hasBorder && element.style.borderTop !== false)
  const bottom = Number(hasBorder && element.style.borderBottom !== false)

  return Object.freeze({
    height:
      rect.height -
      match(vertical)
        .with(true, () => top + bottom)
        .otherwise(() => 0),
    width:
      rect.width -
      match(horizontal)
        .with(true, () => left + right)
        .otherwise(() => 0),
    x:
      rect.x +
      match(horizontal)
        .with(true, () => left)
        .otherwise(() => 0),
    y:
      rect.y +
      match(vertical)
        .with(true, () => top)
        .otherwise(() => 0),
  })
}
