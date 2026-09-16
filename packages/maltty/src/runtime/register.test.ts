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

    expect(registeredNames).toStrictEqual(['gamma', 'alpha', 'beta'])
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
    const errorRef: ErrorRef = { error: undefined }
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
      errorRef,
      instance,
      parentPath: [],
      resolved,
    })

    expect(registeredDescriptions).toStrictEqual([false])
  })

  it('should register a visible command with its description', () => {
    const commands: CommandMap = {
      visible: command({ description: 'A visible command', hidden: false }),
    }

    const resolved: ResolvedRef = { ref: undefined }
    const errorRef: ErrorRef = { error: undefined }
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
      errorRef,
      instance,
      parentPath: [],
      resolved,
    })

    expect(registeredDescriptions).toStrictEqual(['A visible command'])
  })

  it('should pass deprecated to yargs', () => {
    const commands: CommandMap = {
      old: command({ deprecated: 'Use new-cmd instead', description: 'Old command' }),
    }

    const resolved: ResolvedRef = { ref: undefined }
    const errorRef: ErrorRef = { error: undefined }
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
      errorRef,
      instance,
      parentPath: [],
      resolved,
    })

    expect(registeredDeprecated).toStrictEqual(['Use new-cmd instead'])
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

describe('autoloadMarker handling', () => {
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

    expect(registeredNames).toStrictEqual(['create <workspace>'])
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

    expect(registeredNames).toStrictEqual(['list [filter]'])
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

    expect(registeredNames).toStrictEqual(['copy <source> <dest> [flags]'])
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

    expect(registeredNames).toStrictEqual(['status'])
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

describe('default commands', () => {
  it('should run a default command when no subcommand is given', async () => {
    const handler = vi.fn()
    const commands: CommandMap = {
      config: command({ description: 'Config stuff', handler: vi.fn() }),
      search: command({
        default: true,
        description: 'Search things',
        handler,
        options: z.object({ filter: z.string().optional() }),
      }),
    }

    setArgv('--filter', 'x')
    await runTestCli({ commands, name: 'test-cli', version: '1.0.0' })

    expect(handler.mock.calls).toEqual([
      [
        expect.objectContaining({
          args: expect.objectContaining({ filter: 'x' }),
          meta: expect.objectContaining({ command: ['search'] }),
        }),
      ],
    ])
  })

  it('should keep the named invocation form for a default command', async () => {
    const handler = vi.fn()
    const commands: CommandMap = {
      search: command({
        default: true,
        description: 'Search things',
        handler,
        options: z.object({ filter: z.string().optional() }),
      }),
    }

    setArgv('search', '--filter', 'x')
    await runTestCli({ commands, name: 'test-cli', version: '1.0.0' })

    expect(handler.mock.calls).toEqual([
      [
        expect.objectContaining({
          args: expect.objectContaining({ filter: 'x' }),
          meta: expect.objectContaining({ command: ['search'] }),
        }),
      ],
    ])
  })

  it('should bind a leading non-command token to a default command positional', async () => {
    const handler = vi.fn()
    const commands: CommandMap = {
      config: command({ description: 'Config stuff', handler: vi.fn() }),
      search: command({
        default: true,
        description: 'Search things',
        handler,
        positionals: z.object({ pattern: z.string().optional() }),
      }),
    }

    setArgv('needle')
    await runTestCli({ commands, name: 'test-cli', version: '1.0.0' })

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ args: expect.objectContaining({ pattern: 'needle' }) })
    )
  })

  it('should prefer a named command over the default command', async () => {
    const defaultHandler = vi.fn()
    const configHandler = vi.fn()
    const commands: CommandMap = {
      config: command({ description: 'Config stuff', handler: configHandler }),
      search: command({
        default: true,
        description: 'Search things',
        handler: defaultHandler,
        positionals: z.object({ pattern: z.string().optional() }),
      }),
    }

    setArgv('config')
    await runTestCli({ commands, name: 'test-cli', version: '1.0.0' })

    expect(configHandler).toHaveBeenCalledTimes(1)
    expect(defaultHandler).not.toHaveBeenCalled()
  })

  it('should report an empty ctx.meta.command for a nameless default', async () => {
    const handler = vi.fn()
    const commands: CommandMap = {
      index: command({ default: true, description: 'Search things', handler }),
    }

    setArgv()
    await runTestCli({ commands, name: 'test-cli', version: '1.0.0' })

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ meta: expect.objectContaining({ command: [] }) })
    )
  })

  it('should register a default command with $0 as a trailing alias', () => {
    const commands: CommandMap = {
      search: command({
        aliases: ['find'],
        default: true,
        description: 'Search things',
        positionals: z.object({ pattern: z.string() }),
      }),
    }

    const resolved: ResolvedRef = { ref: undefined }
    const errorRef: ErrorRef = { error: undefined }
    const instance = yargs([])

    const originalCommand = instance.command.bind(instance)
    const commandSpy = vi
      .spyOn(instance, 'command')
      .mockImplementation((name: unknown, ...rest: unknown[]) =>
        originalCommand(name as string, ...(rest as [string]))
      )

    registerCommands({ commands, errorRef, instance, parentPath: [], resolved })

    expect(commandSpy.mock.calls.map(([name]) => name)).toStrictEqual([
      ['search <pattern>', 'find', '$0'],
    ])
  })

  it('should set errorRef when two commands are marked default', () => {
    const commands: CommandMap = {
      find: command({ default: true, description: 'Find things' }),
      search: command({ default: true, description: 'Search things' }),
    }

    const resolved: ResolvedRef = { ref: undefined }
    const errorRef: ErrorRef = { error: undefined }

    registerCommands({ commands, errorRef, instance: yargs([]), parentPath: [], resolved })

    expect(errorRef.error).toBeInstanceOf(Error)
    expect(errorRef.error?.message).toContain('Multiple default commands')
  })

  it('should run a default subcommand inside a group', async () => {
    const handler = vi.fn()
    const commands: CommandMap = {
      remote: command({
        commands: {
          add: command({ description: 'Add a remote', handler: vi.fn() }),
          list: command({ default: true, description: 'List remotes', handler }),
        },
        description: 'Manage remotes',
      }),
    }

    setArgv('remote')
    await runTestCli({ commands, name: 'test-cli', version: '1.0.0' })

    expect(handler.mock.calls).toEqual([
      [expect.objectContaining({ meta: expect.objectContaining({ command: ['remote', 'list'] }) })],
    ])
  })
})

describe('default command edge cases', () => {
  it('should omit the nameless default from a subcommand path', async () => {
    const handler = vi.fn()
    const commands: CommandMap = {
      index: command({
        commands: { tail: command({ description: 'Tail output', handler }) },
        default: true,
        description: 'Search things',
      }),
    }

    setArgv('tail')
    await runTestCli({ commands, name: 'test-cli', version: '1.0.0' })

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ meta: expect.objectContaining({ command: ['tail'] }) })
    )
  })

  it('should set errorRef when two subcommands in an unselected group are marked default', () => {
    const commands: CommandMap = {
      other: command({ description: 'Unrelated' }),
      remote: command({
        commands: {
          add: command({ default: true, description: 'Add a remote' }),
          list: command({ default: true, description: 'List remotes' }),
        },
        description: 'Manage remotes',
      }),
    }

    const resolved: ResolvedRef = { ref: undefined }
    const errorRef: ErrorRef = { error: undefined }

    registerCommands({ commands, errorRef, instance: yargs([]), parentPath: [], resolved })

    expect(errorRef.error?.message).toContain('Multiple default commands')
  })

  it('should keep the named form for a default command explicitly named index', async () => {
    const handler = vi.fn()
    const commands: CommandMap = {
      index: command({ default: true, description: 'Search things', handler, name: 'index' }),
    }

    setArgv('index')
    await runTestCli({ commands, name: 'test-cli', version: '1.0.0' })

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ meta: expect.objectContaining({ command: ['index'] }) })
    )
  })

  it('should keep the bare form for a default command explicitly named index', async () => {
    const handler = vi.fn()
    const commands: CommandMap = {
      index: command({ default: true, description: 'Search things', handler, name: 'index' }),
    }

    setArgv()
    await runTestCli({ commands, name: 'test-cli', version: '1.0.0' })

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ meta: expect.objectContaining({ command: ['index'] }) })
    )
  })

  it('should accept a bare group invocation with a nameless default subcommand', async () => {
    const handler = vi.fn()
    const commands: CommandMap = {
      remote: command({
        commands: {
          add: command({ description: 'Add a remote', handler: vi.fn() }),
          index: command({ default: true, description: 'List remotes', handler }),
        },
        description: 'Manage remotes',
      }),
    }

    setArgv('remote')
    await runTestCli({ commands, name: 'test-cli', version: '1.0.0' })

    expect(handler.mock.calls).toEqual([
      [expect.objectContaining({ meta: expect.objectContaining({ command: ['remote'] }) })],
    ])
  })
})
