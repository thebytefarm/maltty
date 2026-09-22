import { PassThrough } from 'node:stream'

import type { DOMElement } from 'ink'
import { Box, measureElement, render, Text, useInput } from 'ink'
import type { ReactElement } from 'react'
import { useLayoutEffect, useReducer } from 'react'
import { describe, expect, it, vi } from 'vitest'

import type { InteractionHitGridStore, InteractionRect, InteractionTarget } from './hit-testing.js'
import { createInteractionHitGrid, createInteractionHitGridStore } from './hit-testing.js'
import type { SgrMouseEvent } from './sgr-mouse.js'
import { parseSgrMouse } from './sgr-mouse.js'

interface ProbeProps {
  readonly hitGrid: InteractionHitGridStore
  readonly offsetX: number
  readonly offsetY: number
  readonly onElement: (element: DOMElement | null) => void
  readonly onHit: (event: SgrMouseEvent) => void
}

function Probe({ hitGrid, offsetX, offsetY, onElement, onHit }: ProbeProps): ReactElement {
  useFrameAfterRefsAttach()

  useInput((input) => {
    const [event, error] = parseSgrMouse(input)
    if (error) {
      return
    }

    if (hitGrid.resolve(event) !== null) {
      onHit(event)
    }
  })

  return (
    <Box paddingLeft={offsetX} paddingTop={offsetY}>
      <Box ref={onElement} height={1} width={5}>
        <Text>probe</Text>
      </Box>
    </Box>
  )
}

function ResizeProbe({
  onElement,
}: {
  readonly onElement: (element: DOMElement | null) => void
}): ReactElement {
  useFrameAfterRefsAttach()

  return (
    <Box justifyContent="flex-end" width="100%">
      <Box ref={onElement} height={1} width={5}>
        <Text>probe</Text>
      </Box>
    </Box>
  )
}

function useFrameAfterRefsAttach(): void {
  const [, requestFrame] = useReducer((generation: number) => generation + 1, 0)
  useLayoutEffect(requestFrame, [requestFrame])
}

function createInput(): NodeJS.ReadStream {
  const input = new PassThrough() as unknown as NodeJS.ReadStream
  Object.defineProperty(input, 'isTTY', { value: true })
  Object.defineProperty(input, 'ref', { value: vi.fn<() => NodeJS.ReadStream>(() => input) })
  Object.defineProperty(input, 'setRawMode', {
    value: vi.fn<(mode: boolean) => NodeJS.ReadStream>(() => input),
  })
  Object.defineProperty(input, 'unref', { value: vi.fn<() => NodeJS.ReadStream>(() => input) })
  return input
}

function createOutput(): NodeJS.WriteStream {
  const output = new PassThrough() as unknown as NodeJS.WriteStream
  Object.defineProperty(output, 'columns', { configurable: true, value: 80 })
  Object.defineProperty(output, 'isTTY', { value: true })
  Object.defineProperty(output, 'rows', { configurable: true, value: 24 })
  return output
}

describe('interaction spike', () => {
  it('should publish hit grids with rendered Ink frames after layout changes', async () => {
    const stdin = createInput()
    const stdout = createOutput()
    const onHit = vi.fn<(event: SgrMouseEvent) => void>()
    const onMeasure = vi.fn<(rect: InteractionRect) => void>()
    const elements = new Map<string, DOMElement>()
    const hitGrid = createInteractionHitGridStore({
      frame: createInteractionHitGrid({ height: 0, targets: [], width: 0 }),
    })
    const onElement = (element: DOMElement | null): void => {
      if (element === null) {
        elements.delete('probe')
        return
      }
      elements.set('probe', element)
    }
    const commitFrame = (): void => {
      const element = elements.get('probe')
      if (element === undefined) {
        return
      }
      const rect = Object.freeze(measureElement(element))
      const target: InteractionTarget = Object.freeze({ disabled: false, id: 'probe', rect })
      hitGrid.commit(
        createInteractionHitGrid({ height: stdout.rows, targets: [target], width: stdout.columns })
      )
      onMeasure(rect)
    }
    const app = render(
      <Probe hitGrid={hitGrid} offsetX={3} offsetY={2} onElement={onElement} onHit={onHit} />,
      {
        exitOnCtrlC: false,
        interactive: true,
        onRender: commitFrame,
        patchConsole: false,
        stderr: stdout,
        stdin,
        stdout,
      }
    )

    await app.waitUntilRenderFlush()
    await vi.waitFor(() =>
      expect(onMeasure).toHaveBeenLastCalledWith({ height: 1, width: 5, x: 3, y: 2 })
    )

    stdin.push('\u001B[<0;4;3M')
    await vi.waitFor(() => expect(onHit).toHaveBeenCalledTimes(1))

    app.rerender(
      <Probe hitGrid={hitGrid} offsetX={7} offsetY={4} onElement={onElement} onHit={onHit} />
    )
    await app.waitUntilRenderFlush()
    await vi.waitFor(() =>
      expect(onMeasure).toHaveBeenLastCalledWith({ height: 1, width: 5, x: 7, y: 4 })
    )

    stdin.push('\u001B[<0;8;5M')
    await vi.waitFor(() => expect(onHit).toHaveBeenCalledTimes(2))

    app.unmount()
  })

  it('should remeasure full-width layout after terminal resize', async () => {
    const stdin = createInput()
    const stdout = createOutput()
    const onElement = vi.fn<(element: DOMElement | null) => void>()
    const hitGrid = createInteractionHitGridStore({
      frame: createInteractionHitGrid({ height: 0, targets: [], width: 0 }),
    })
    const commitFrame = (): void => {
      const element = onElement.mock.calls.at(-1)?.[0]
      if (element === null || element === undefined) {
        return
      }
      hitGrid.commit(
        createInteractionHitGrid({
          height: stdout.rows,
          targets: [{ disabled: false, id: 'probe', rect: measureElement(element) }],
          width: stdout.columns,
        })
      )
    }
    const app = render(<ResizeProbe onElement={onElement} />, {
      exitOnCtrlC: false,
      interactive: true,
      onRender: commitFrame,
      patchConsole: false,
      stderr: stdout,
      stdin,
      stdout,
    })

    await app.waitUntilRenderFlush()
    const element = onElement.mock.calls.at(-1)?.[0] as DOMElement
    expect(measureElement(element)).toStrictEqual({ height: 1, width: 5, x: 75, y: 0 })
    expect(hitGrid.resolve({ x: 75, y: 0 })?.id).toBe('probe')

    Object.defineProperty(stdout, 'columns', { configurable: true, value: 60 })
    stdout.emit('resize')
    await app.waitUntilRenderFlush()
    expect(measureElement(element)).toStrictEqual({ height: 1, width: 5, x: 55, y: 0 })
    expect(hitGrid.resolve({ x: 75, y: 0 })).toBeNull()
    expect(hitGrid.resolve({ x: 55, y: 0 })?.id).toBe('probe')

    app.unmount()
  })
})
