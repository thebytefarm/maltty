import { setArgv, runTestCli, setupTestLifecycle } from '@test/index.js'
import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

import { command } from '@/command.js'
import type { CommandContext } from '@/context/types.js'
import type { CommandMap } from '@/types/index.js'

const mockSpinnerInstance = vi.hoisted(() => ({
  message: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
}))

vi.mock(import('@clack/prompts'), async (importOriginal) => ({
  ...(await importOriginal()),
  cancel: vi.fn(),
  confirm: vi.fn(),
  intro: vi.fn(),
  isCancel: vi.fn(() => false),
  log: {
    error: vi.fn(),
    info: vi.fn(),
    message: vi.fn(),
    step: vi.fn(),
    success: vi.fn(),
    warn: vi.fn(),
  },
  multiselect: vi.fn(),
  note: vi.fn(),
  outro: vi.fn(),
  password: vi.fn(),
  select: vi.fn(),
  spinner: vi.fn(() => mockSpinnerInstance),
  text: vi.fn(),
}))

setupTestLifecycle()

describe('args with zod schema', () => {
  it('passes validated zod args to the handler', async () => {
    const handler = vi.fn()
    const commands: CommandMap = {
      greet: command({
        description: 'Greet someone',
        options: z.object({
          name: z.string(),
        }),
        handler,
      }),
    }

    setArgv('greet', '--name', 'Alice')
    await runTestCli({
      commands,
      name: 'test-cli',
      version: '1.0.0',
    })

    expect(handler).toHaveBeenCalledTimes(1)
    const ctx = handler.mock.calls[0]![0] as CommandContext
    expect(ctx.args).toMatchObject({ name: 'Alice' })
  })

  it('handles optional zod args', async () => {
    const handler = vi.fn()
    const commands: CommandMap = {
      greet: command({
        description: 'Greet someone',
        options: z.object({
          loud: z.boolean().optional(),
          name: z.string(),
        }),
        handler,
      }),
    }

    setArgv('greet', '--name', 'Bob')
    await runTestCli({
      commands,
      name: 'test-cli',
      version: '1.0.0',
    })

    expect(handler).toHaveBeenCalledTimes(1)
    const ctx = handler.mock.calls[0]![0] as CommandContext
    expect(ctx.args).toMatchObject({ name: 'Bob' })
  })

  it('handles zod args with defaults', async () => {
    const handler = vi.fn()
    const commands: CommandMap = {
      greet: command({
        description: 'Greet someone',
        options: z.object({
          greeting: z.string().default('hello'),
          name: z.string(),
        }),
        handler,
      }),
    }

    setArgv('greet', '--name', 'Charlie')
    await runTestCli({
      commands,
      name: 'test-cli',
      version: '1.0.0',
    })

    expect(handler).toHaveBeenCalledTimes(1)
    const ctx = handler.mock.calls[0]![0] as CommandContext
    expect(ctx.args).toMatchObject({ greeting: 'hello', name: 'Charlie' })
  })

  it('converts zod number args correctly', async () => {
    const handler = vi.fn()
    const commands: CommandMap = {
      count: command({
        description: 'Count things',
        options: z.object({
          count: z.number(),
        }),
        handler,
      }),
    }

    setArgv('count', '--count', '42')
    await runTestCli({
      commands,
      name: 'test-cli',
      version: '1.0.0',
    })

    expect(handler).toHaveBeenCalledTimes(1)
    const ctx = handler.mock.calls[0]![0] as CommandContext
    expect(ctx.args).toMatchObject({ count: 42 })
  })

  it('converts zod boolean args correctly', async () => {
    const handler = vi.fn()
    const commands: CommandMap = {
      run: command({
        description: 'Run with verbose',
        options: z.object({
          verbose: z.boolean(),
        }),
        handler,
      }),
    }

    setArgv('run', '--verbose')
    await runTestCli({
      commands,
      name: 'test-cli',
      version: '1.0.0',
    })

    expect(handler).toHaveBeenCalledTimes(1)
    const ctx = handler.mock.calls[0]![0] as CommandContext
    expect(ctx.args).toMatchObject({ verbose: true })
  })
})

describe('args with yargs native format', () => {
  it('passes yargs-format args to the handler', async () => {
    const handler = vi.fn()
    const commands: CommandMap = {
      greet: command({
        description: 'Greet someone',
        options: {
          name: { description: 'Name to greet', required: true, type: 'string' as const },
        },
        handler,
      }),
    }

    setArgv('greet', '--name', 'Diana')
    await runTestCli({
      commands,
      name: 'test-cli',
      version: '1.0.0',
    })

    expect(handler).toHaveBeenCalledTimes(1)
    const ctx = handler.mock.calls[0]![0] as CommandContext
    expect(ctx.args).toMatchObject({ name: 'Diana' })
  })

  it('handles optional yargs-format args', async () => {
    const handler = vi.fn()
    const commands: CommandMap = {
      run: command({
        description: 'Run something',
        options: {
          verbose: { description: 'Verbose output', type: 'boolean' as const },
        },
        handler,
      }),
    }

    setArgv('run')
    await runTestCli({
      commands,
      name: 'test-cli',
      version: '1.0.0',
    })

    expect(handler).toHaveBeenCalledTimes(1)
  })
})
