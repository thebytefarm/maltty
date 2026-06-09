import { runTestCli, setArgv, setupTestLifecycle } from '@test/index.js'
import { describe, expect, it, vi } from 'vitest'
import yargs from 'yargs'
import { z } from 'zod'

import { command } from '@/command.js'
import type { CommandMap } from '@/types/index.js'

import type { ErrorRef } from './register.js'
import { registerCommands } from './register.js'
import type { ResolvedRef } from './types.js'

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

const { getExitSpy } = setupTestLifecycle()

describe('command registration and execution', () => {
  it('executes a simple command handler', async () => {
    const handler = vi.fn()
    const commands: CommandMap = {
      greet: command({
        description: 'Greet someone',
        handler,
      }),
    }

    setArgv('greet')
    await runTestCli({
      commands,
      name: 'test-cli',
      version: '1.0.0',
    })

    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        meta: expect.objectContaining({
          command: ['greet'],
          name: 'test-cli',
          version: '1.0.0',
        }),
      })
    )
  })

  it('executes nested subcommands', async () => {
    const handler = vi.fn()
    const commands: CommandMap = {
      deploy: command({
        commands: {
          preview: command({
            description: 'Deploy to preview',
            handler,
          }),
        },
        description: 'Deploy commands',
      }),
    }

    setArgv('deploy', 'preview')
    await runTestCli({
      commands,
      name: 'test-cli',
      version: '1.0.0',
    })

    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        meta: expect.objectContaining({
          command: ['deploy', 'preview'],
        }),
      })
    )
  })

  it('handles command with no handler gracefully', async () => {
    const commands: CommandMap = {
      noop: command({
        description: 'Does nothing',
      }),
    }

    setArgv('noop')
    await runTestCli({
      commands,
      name: 'test-cli',
      version: '1.0.0',
    })

    // Should not exit with error
    expect(getExitSpy()).not.toHaveBeenCalled()
  })
})

describe('command ordering', () => {
  it('should register commands in specified order', () => {
    const commands: CommandMap = {
      alpha: command({ description: 'Alpha' }),
      beta: command({ description: 'Beta' }),
      gamma: command({ description: 'Gamma' }),
    }

    const resolved: ResolvedRef = { ref: undefined }
    const errorRef: ErrorRef = { error: undefined }
    const instance = yargs([])

    const registeredNames: string[] = []
    const originalCommand = instance.command.bind(instance)
    vi.spyOn(instance, 'command').mockImplementation((name: unknown, ...rest: unknown[]) => {
      registeredNames.push(name as string)
      return originalCommand(name as string, ...(rest as [string]))
    })

    registerCommands({
      commands,
      errorRef,
      instance,
      order: ['gamma', 'alpha'],
      parentPath: [],
      resolved,
    })

    expect(registeredNames).toEqual(['gamma', 'alpha', 'beta'])
    expect(errorRef.error).toBeUndefined()
  })

  it('should set errorRef when order contains invalid names', () => {
    const commands: CommandMap = {
      alpha: command({ description: 'Alpha' }),
      beta: command({ description: 'Beta' }),
    }

    const resolved: ResolvedRef = { ref: undefined }
    const errorRef: ErrorRef = { error: undefined }
    const instance = yargs([])

    registerCommands({
      commands,
      errorRef,
      instance,
      order: ['alpha', 'missing'],
      parentPath: [],
      resolved,
    })

    expect(errorRef.error).toBeInstanceOf(Error)
    expect(errorRef.error?.message).toContain('"missing"')
  })

  it('should set errorRef when order contains duplicate names', () => {
    const commands: CommandMap = {
      alpha: command({ description: 'Alpha' }),
      beta: command({ description: 'Beta' }),
    }

    const resolved: ResolvedRef = { ref: undefined }
    const errorRef: ErrorRef = { error: undefined }
    const instance = yargs([])

    registerCommands({
      commands,
      errorRef,
      instance,
      order: ['alpha', 'alpha'],
      parentPath: [],
      resolved,
    })

    expect(errorRef.error).toBeInstanceOf(Error)
    expect(errorRef.error?.message).toContain('duplicate')
  })

  it('should not validate order when order array is empty', () => {
    const commands: CommandMap = {
      alpha: command({ description: 'Alpha' }),
      beta: command({ description: 'Beta' }),
    }

    const resolved: ResolvedRef = { ref: undefined }
    const errorRef: ErrorRef = { error: undefined }
    const instance = yargs([])

    registerCommands({
      commands,
      errorRef,
      instance,
      order: [],
      parentPath: [],
      resolved,
    })

    expect(errorRef.error).toBeUndefined()
  })

  it('should handle subcommand ordering via cmd.help.order', () => {
    const commands: CommandMap = {
      deploy: command({
        commands: {
          preview: command({ description: 'Preview' }),
          production: command({ description: 'Production' }),
          staging: command({ description: 'Staging' }),
        },
        description: 'Deploy',
        help: { order: ['production', 'staging'] },
      }),
    }

    const resolved: ResolvedRef = { ref: undefined }
    const errorRef: ErrorRef = { error: undefined }
    const instance = yargs([])

    registerCommands({
      commands,
      errorRef,
      instance,
      parentPath: [],
      resolved,
    })

    expect(errorRef.error).toBeUndefined()
  })
})

describe('hidden and deprecated commands', () => {
  it('should register a hidden command with false as description', () => {
    const commands: CommandMap = {
      secret: command({ description: 'Internal only', hidden: true }),
    }

    const resolved: ResolvedRef = { ref: undefined }
    const instance = yargs([])

    const registeredDescriptions: (string | false)[] = []
    const originalCommand = instance.command.bind(instance)
    vi.spyOn(instance, 'command').mockImplementation(
      (_name: unknown, desc: unknown, ...rest: unknown[]) => {
        registeredDescriptions.push(desc as string | false)
        return originalCommand(_name as string, desc as string, ...(rest as []))
      }
    )

    registerCommands({
      commands,
      instance,
      parentPath: [],
      resolved,
    })

    expect(registeredDescriptions).toEqual([false])
  })

  it('should register a visible command with its description', () => {
    const commands: CommandMap = {
      visible: command({ description: 'A visible command', hidden: false }),
    }

    const resolved: ResolvedRef = { ref: undefined }
    const instance = yargs([])

    const registeredDescriptions: (string | false)[] = []
    const originalCommand = instance.command.bind(instance)
    vi.spyOn(instance, 'command').mockImplementation(
      (_name: unknown, desc: unknown, ...rest: unknown[]) => {
        registeredDescriptions.push(desc as string | false)
        return originalCommand(_name as string, desc as string, ...(rest as []))
      }
    )

    registerCommands({
      commands,
      instance,
      parentPath: [],
      resolved,
    })

    expect(registeredDescriptions).toEqual(['A visible command'])
  })

  it('should pass deprecated to yargs', () => {
    const commands: CommandMap = {
      old: command({ deprecated: 'Use new-cmd instead', description: 'Old command' }),
    }

    const resolved: ResolvedRef = { ref: undefined }
    const instance = yargs([])

    const registeredDeprecated: (string | boolean | undefined)[] = []
    const originalCommand = instance.command.bind(instance)
    vi.spyOn(instance, 'command').mockImplementation(
      (
        _name: unknown,
        _desc: unknown,
        _builder: unknown,
        _handler: unknown,
        _mw: unknown,
        deprecated: unknown,
        ...rest: unknown[]
      ) => {
        registeredDeprecated.push(deprecated as string | boolean | undefined)
        return originalCommand(_name as string, _desc as string, ...(rest as []))
      }
    )

    registerCommands({
      commands,
      instance,
      parentPath: [],
      resolved,
    })

    expect(registeredDeprecated).toEqual(['Use new-cmd instead'])
  })

  it('should execute a hidden command handler', async () => {
    const handler = vi.fn()
    const commands: CommandMap = {
      debug: command({
        description: 'Debug command',
        handler,
        hidden: true,
      }),
    }

    setArgv('debug')
    await runTestCli({
      commands,
      name: 'test-cli',
      version: '1.0.0',
    })

    expect(handler).toHaveBeenCalledTimes(1)
  })
})

describe('AutoloadMarker handling', () => {
  it('skips AutoloadMarker entries in command map', async () => {
    const handler = vi.fn()
    const commands: CommandMap = {
      run: command({
        description: 'Run',
        handler,
      }),
    }

    // Inject an autoload marker alongside a real command
    const commandsWithAutoload = {
      ...commands,
      __autoload: { dir: './commands' },
    } as unknown as CommandMap

    setArgv('run')
    await runTestCli({
      commands: commandsWithAutoload,
      name: 'test-cli',
      version: '1.0.0',
    })

    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('skips nested AutoloadMarker entries', async () => {
    const handler = vi.fn()
    const commands: CommandMap = {
      parent: command({
        commands: {
          __autoload: { dir: './sub' } as unknown as ReturnType<typeof command>,
          child: command({
            description: 'Child',
            handler,
          }),
        },
        description: 'Parent',
      }),
    }

    setArgv('parent', 'child')
    await runTestCli({
      commands,
      name: 'test-cli',
      version: '1.0.0',
    })

    expect(handler).toHaveBeenCalledTimes(1)
  })
})

describe('positional argument support', () => {
  it('should register command with required positional placeholder', () => {
    const commands: CommandMap = {
      create: command({
        description: 'Create a workspace',
        positionals: z.object({ workspace: z.string() }),
      }),
    }

    const resolved: ResolvedRef = { ref: undefined }
    const errorRef: ErrorRef = { error: undefined }
    const instance = yargs([])

    const registeredNames: string[] = []
    const originalCommand = instance.command.bind(instance)
    vi.spyOn(instance, 'command').mockImplementation((name: unknown, ...rest: unknown[]) => {
      registeredNames.push(name as string)
      return originalCommand(name as string, ...(rest as [string]))
    })

    registerCommands({
      commands,
      errorRef,
      instance,
      parentPath: [],
      resolved,
    })

    expect(registeredNames).toEqual(['create <workspace>'])
    expect(errorRef.error).toBeUndefined()
  })

  it('should register command with optional positional placeholder', () => {
    const commands: CommandMap = {
      list: command({
        description: 'List items',
        positionals: z.object({ filter: z.string().optional() }),
      }),
    }

    const resolved: ResolvedRef = { ref: undefined }
    const errorRef: ErrorRef = { error: undefined }
    const instance = yargs([])

    const registeredNames: string[] = []
    const originalCommand = instance.command.bind(instance)
    vi.spyOn(instance, 'command').mockImplementation((name: unknown, ...rest: unknown[]) => {
      registeredNames.push(name as string)
      return originalCommand(name as string, ...(rest as [string]))
    })

    registerCommands({
      commands,
      errorRef,
      instance,
      parentPath: [],
      resolved,
    })

    expect(registeredNames).toEqual(['list [filter]'])
  })

  it('should register command with multiple positionals', () => {
    const commands: CommandMap = {
      copy: command({
        description: 'Copy files',
        positionals: z.object({
          source: z.string(),
          dest: z.string(),
          flags: z.string().optional(),
        }),
      }),
    }

    const resolved: ResolvedRef = { ref: undefined }
    const errorRef: ErrorRef = { error: undefined }
    const instance = yargs([])

    const registeredNames: string[] = []
    const originalCommand = instance.command.bind(instance)
    vi.spyOn(instance, 'command').mockImplementation((name: unknown, ...rest: unknown[]) => {
      registeredNames.push(name as string)
      return originalCommand(name as string, ...(rest as [string]))
    })

    registerCommands({
      commands,
      errorRef,
      instance,
      parentPath: [],
      resolved,
    })

    expect(registeredNames).toEqual(['copy <source> <dest> [flags]'])
  })

  it('should register command with no positionals as bare name', () => {
    const commands: CommandMap = {
      status: command({
        description: 'Show status',
      }),
    }

    const resolved: ResolvedRef = { ref: undefined }
    const errorRef: ErrorRef = { error: undefined }
    const instance = yargs([])

    const registeredNames: string[] = []
    const originalCommand = instance.command.bind(instance)
    vi.spyOn(instance, 'command').mockImplementation((name: unknown, ...rest: unknown[]) => {
      registeredNames.push(name as string)
      return originalCommand(name as string, ...(rest as [string]))
    })

    registerCommands({
      commands,
      errorRef,
      instance,
      parentPath: [],
      resolved,
    })

    expect(registeredNames).toEqual(['status'])
  })

  it('should execute command handler with positional arg value', async () => {
    const handler = vi.fn()
    const commands: CommandMap = {
      greet: command({
        description: 'Greet someone',
        handler,
        positionals: z.object({ name: z.string() }),
      }),
    }

    setArgv('greet', 'world')
    await runTestCli({
      commands,
      name: 'test-cli',
      version: '1.0.0',
    })

    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        args: expect.objectContaining({
          name: 'world',
        }),
      })
    )
  })
})
