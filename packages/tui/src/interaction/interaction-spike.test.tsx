import { PassThrough } from 'node:stream'

import type { DOMElement } from 'ink'
import { Box, measureElement, render, Text, useInput } from 'ink'
import type { ReactElement } from 'react'
import { useEffect, useRef } from 'react'
import { describe, expect, it, vi } from 'vitest'

import type { InteractionRect, InteractionTarget } from './hit-testing.js'
import { resolveInteractionTarget } from './hit-testing.js'
import type { SgrMouseEvent } from './sgr-mouse.js'
import { parseSgrMouse } from './sgr-mouse.js'

interface ProbeProps {
  readonly offsetX: number
  readonly offsetY: number
  readonly onHit: (event: SgrMouseEvent) => void
  readonly onMeasure: (rect: InteractionRect) => void
}

function Probe({ offsetX, offsetY, onHit, onMeasure }: ProbeProps): ReactElement {
  const ref = useRef<DOMElement>(null)
  const rect = useRef<InteractionRect | null>(null)

  useEffect(() => {
    if (ref.current === null) {
      return
    }
    const measured = Object.freeze(measureElement(ref.current))
    rect.current = measured
    onMeasure(measured)
  }, [offsetX, offsetY, onMeasure])

  useInput((input) => {
    const [error, event] = parseSgrMouse(input)
    if (error || rect.current === null) {
      return
    }

    const target: InteractionTarget = {
      disabled: false,
      id: 'probe',
      priority: 0,
      rect: rect.current,
    }
    const resolved = resolveInteractionTarget({ point: event, targets: [target] })
    if (resolved !== null) {
      onHit(event)
    }
  })

  return (
    <Box paddingLeft={offsetX} paddingTop={offsetY}>
      <Box ref={ref} height={1} width={5}>
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
  return (
    <Box justifyContent="flex-end" width="100%">
      <Box ref={onElement} height={1} width={5}>
        <Text>probe</Text>
      </Box>
    </Box>
  )
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
  it('should align nested Ink measurements with SGR input after layout changes', async () => {
    const stdin = createInput()
    const stdout = createOutput()
    const onHit = vi.fn<(event: SgrMouseEvent) => void>()
    const onMeasure = vi.fn<(rect: InteractionRect) => void>()
    const app = render(<Probe offsetX={3} offsetY={2} onHit={onHit} onMeasure={onMeasure} />, {
      exitOnCtrlC: false,
      interactive: true,
      patchConsole: false,
      stderr: stdout,
      stdin,
      stdout,
    })

    await app.waitUntilRenderFlush()
    await vi.waitFor(() =>
      expect(onMeasure).toHaveBeenLastCalledWith({ height: 1, width: 5, x: 3, y: 2 })
    )

    stdin.push('\u001B[<0;4;3M')
    await vi.waitFor(() => expect(onHit).toHaveBeenCalledTimes(1))

    app.rerender(<Probe offsetX={7} offsetY={4} onHit={onHit} onMeasure={onMeasure} />)
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
    const app = render(<ResizeProbe onElement={onElement} />, {
      exitOnCtrlC: false,
      interactive: true,
      patchConsole: false,
      stderr: stdout,
      stdin,
      stdout,
    })

    await app.waitUntilRenderFlush()
    const element = onElement.mock.calls.at(-1)?.[0] as DOMElement
    expect(measureElement(element)).toStrictEqual({ height: 1, width: 5, x: 75, y: 0 })

    Object.defineProperty(stdout, 'columns', { configurable: true, value: 60 })
    stdout.emit('resize')
    await app.waitUntilRenderFlush()
    expect(measureElement(element)).toStrictEqual({ height: 1, width: 5, x: 55, y: 0 })

    app.unmount()
  })
})
