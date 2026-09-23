import assert from 'node:assert/strict'
import { PassThrough } from 'node:stream'

import type { Instance, RenderOptions } from 'ink'
import { Box, render, Text, useInput } from 'ink'
import type { ReactElement } from 'react'
import { describe, expect, it, vi } from 'vitest'

import type { InteractionClickEvent } from './controller.js'
import { ENABLE_BUTTON_MOUSE, ENABLE_SGR_MOUSE } from './mouse-mode.js'
import { Pressable } from './pressable.js'
import { renderInteractive } from './render-interactive.js'

interface ClickProbeProps {
  readonly disabled?: boolean
  readonly onClick: (event: InteractionClickEvent) => void
}

function ClickProbe({ disabled = false, onClick }: ClickProbeProps): ReactElement {
  return (
    <Pressable disabled={disabled} height={1} onClick={onClick} width={5}>
      <Text>probe</Text>
    </Pressable>
  )
}

function InputSink(): null {
  useInput(() => undefined)
  return null
}

function createInput({ isTty = true }: { readonly isTty?: boolean } = {}): NodeJS.ReadStream {
  const input = new PassThrough() as unknown as NodeJS.ReadStream
  Object.defineProperty(input, 'isTTY', { value: isTty })
  Object.defineProperty(input, 'ref', { value: vi.fn<() => NodeJS.ReadStream>(() => input) })
  Object.defineProperty(input, 'setRawMode', {
    value: vi.fn<(mode: boolean) => NodeJS.ReadStream>(() => input),
  })
  Object.defineProperty(input, 'unref', { value: vi.fn<() => NodeJS.ReadStream>(() => input) })
  return input
}

function createOutput({ isTty = true }: { readonly isTty?: boolean } = {}): NodeJS.WriteStream {
  const output = new PassThrough() as unknown as NodeJS.WriteStream
  Object.defineProperty(output, 'columns', { configurable: true, value: 80 })
  Object.defineProperty(output, 'isTTY', { value: isTty })
  Object.defineProperty(output, 'rows', { configurable: true, value: 24 })
  return output
}

function waitForInput(): Promise<void> {
  return new Promise((resolve) => {
    setImmediate(resolve)
  })
}

function expectRenderSuccess(result: ReturnType<typeof renderInteractive>): Instance {
  const [app, error] = result
  assert.equal(error, null)
  assert.notEqual(app, null)
  return app
}

describe(renderInteractive, () => {
  it('should dispatch a click after press and release on the same target', async () => {
    const stdin = createInput()
    const stdout = createOutput()
    const onClick = vi.fn<(event: InteractionClickEvent) => void>()
    const onRender = vi.fn<NonNullable<RenderOptions['onRender']>>()
    const app = expectRenderSuccess(
      renderInteractive({
        node: <ClickProbe onClick={onClick} />,
        options: {
          alternateScreen: false,
          interactive: true,
          onRender,
          origin: { x: 0, y: 0 },
          patchConsole: false,
          stdin,
          stdout,
        },
      })
    )

    await app.waitUntilRenderFlush()
    await vi.waitFor(() => expect(onRender.mock.calls.length).toBeGreaterThanOrEqual(2))

    stdin.push('\u001B[<0;1;1M')
    await waitForInput()
    stdin.push('\u001B[<0;1;1m')

    await vi.waitFor(() => expect(onClick).toHaveBeenCalledOnce())
    expect(onClick).toHaveBeenCalledWith({
      button: 'left',
      localX: 0,
      localY: 0,
      modifiers: { alt: false, ctrl: false, shift: false },
      targetId: expect.any(String),
      viewportX: 0,
      viewportY: 0,
    })

    app.unmount()
  })

  it('should not dispatch clicks for disabled targets', async () => {
    const stdin = createInput()
    const stdout = createOutput()
    const onClick = vi.fn<(event: InteractionClickEvent) => void>()
    const app = expectRenderSuccess(
      renderInteractive({
        node: <ClickProbe disabled onClick={onClick} />,
        options: {
          alternateScreen: false,
          interactive: true,
          origin: { x: 0, y: 0 },
          patchConsole: false,
          stdin,
          stdout,
        },
      })
    )

    await app.waitUntilRenderFlush()
    stdin.push('\u001B[<0;1;1M')
    await waitForInput()
    stdin.push('\u001B[<0;1;1m')
    await waitForInput()

    expect(onClick).not.toHaveBeenCalled()
    app.unmount()
  })

  it('should not dispatch when press and release resolve to different targets', async () => {
    const stdin = createInput()
    const stdout = createOutput()
    const onFirstClick = vi.fn<(event: InteractionClickEvent) => void>()
    const onSecondClick = vi.fn<(event: InteractionClickEvent) => void>()
    const app = expectRenderSuccess(
      renderInteractive({
        node: (
          <Box flexDirection="row">
            <ClickProbe onClick={onFirstClick} />
            <ClickProbe onClick={onSecondClick} />
          </Box>
        ),
        options: {
          alternateScreen: false,
          interactive: true,
          origin: { x: 0, y: 0 },
          patchConsole: false,
          stdin,
          stdout,
        },
      })
    )

    await app.waitUntilRenderFlush()
    stdin.push('\u001B[<0;1;1M')
    await waitForInput()
    stdin.push('\u001B[<0;6;1m')
    await waitForInput()

    expect(onFirstClick).not.toHaveBeenCalled()
    expect(onSecondClick).not.toHaveBeenCalled()
    app.unmount()
  })

  it('should exclude overflow-hidden ancestor borders from child hit targets', async () => {
    const stdin = createInput()
    const stdout = createOutput()
    const onClick = vi.fn<(event: InteractionClickEvent) => void>()
    const onRender = vi.fn<NonNullable<RenderOptions['onRender']>>()
    const app = expectRenderSuccess(
      renderInteractive({
        node: (
          <Box borderStyle="single" overflow="hidden" width={7}>
            <ClickProbe onClick={onClick} />
          </Box>
        ),
        options: {
          alternateScreen: false,
          interactive: true,
          onRender,
          origin: { x: 0, y: 0 },
          patchConsole: false,
          stdin,
          stdout,
        },
      })
    )

    await app.waitUntilRenderFlush()
    await vi.waitFor(() => expect(onRender.mock.calls.length).toBeGreaterThanOrEqual(2))

    stdin.push('\u001B[<0;1;2M')
    await waitForInput()
    stdin.push('\u001B[<0;1;2m')
    await waitForInput()

    expect(onClick).not.toHaveBeenCalled()

    stdin.push('\u001B[<0;2;2M')
    await waitForInput()
    stdin.push('\u001B[<0;2;2m')
    await vi.waitFor(() => expect(onClick).toHaveBeenCalledOnce())

    app.unmount()
  })

  it('should leave pointer interaction disabled for non-TTY streams', async () => {
    const stdin = createInput({ isTty: false })
    const stdout = createOutput({ isTty: false })
    const write = vi.spyOn(stdout, 'write')
    const onClick = vi.fn<(event: InteractionClickEvent) => void>()
    const app = expectRenderSuccess(
      renderInteractive({
        node: <ClickProbe onClick={onClick} />,
        options: {
          alternateScreen: false,
          interactive: true,
          origin: { x: 0, y: 0 },
          patchConsole: false,
          stdin,
          stdout,
        },
      })
    )

    await app.waitUntilRenderFlush()
    app.rerender(<Text>second frame</Text>)
    await app.waitUntilRenderFlush()

    const output = write.mock.calls.map(([chunk]) => String(chunk)).join('')
    expect(output).not.toContain(ENABLE_BUTTON_MOUSE)
    expect(output).not.toContain(ENABLE_SGR_MOUSE)
    expect(output).not.toContain('\u001B[2K')
    expect(onClick).not.toHaveBeenCalled()

    app.unmount()
  })

  it.each([
    { x: 0.5, y: 0 },
    { x: Number.POSITIVE_INFINITY, y: 0 },
  ])('should return errors for non-integer or non-finite origins: $x,$y', (origin) => {
    const [app, error] = renderInteractive({
      node: <Text>probe</Text>,
      options: { origin },
    })

    expect(app).toBeNull()
    expect(error).not.toBeNull()
  })
})

describe(Pressable, () => {
  it('should leave onClick inert under ordinary Ink rendering', async () => {
    const stdin = createInput()
    const stdout = createOutput()
    const onClick = vi.fn<(event: InteractionClickEvent) => void>()
    const app = render(
      <>
        <ClickProbe onClick={onClick} />
        <InputSink />
      </>,
      {
        interactive: true,
        patchConsole: false,
        stdin,
        stdout,
      }
    )

    await app.waitUntilRenderFlush()
    stdin.push('\u001B[<0;1;1M')
    await waitForInput()
    stdin.push('\u001B[<0;1;1m')
    await waitForInput()

    expect(onClick).not.toHaveBeenCalled()
    app.unmount()
  })
})
