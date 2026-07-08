import type { CommandContext } from 'maltty'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockFsExists = vi.fn()

vi.mock(import('@maltty/utils/node'), () => ({
  fs: { exists: mockFsExists },
}))

vi.mock(import('@maltty/config/utils'), () => ({
  loadConfig: vi.fn(),
}))

vi.mock(import('maltty'), () => ({
  autoload: vi.fn(),
  command: vi.fn((def) => def),
}))

const { loadConfig } = await import('@maltty/config/utils')
const { autoload } = await import('maltty')
const mockedLoadConfig = vi.mocked(loadConfig)
const mockedAutoload = vi.mocked(autoload)

function makeContext(): CommandContext {
  return {
    args: {},
    config: {},
    fail: vi.fn((msg: string) => {
      throw new Error(msg)
    }) as never,
    format: { json: vi.fn(() => ''), table: vi.fn(() => '') },
    log: {
      error: vi.fn(),
      info: vi.fn(),
      intro: vi.fn(),
      message: vi.fn(),
      newline: vi.fn(),
      note: vi.fn(),
      outro: vi.fn(),
      raw: vi.fn(),
      step: vi.fn(),
      success: vi.fn(),
      warn: vi.fn(),
    },
    meta: { command: ['commands'], name: 'maltty', version: '0.0.0' },
    prompts: {
      confirm: vi.fn(),
      multiselect: vi.fn(),
      password: vi.fn(),
      select: vi.fn(),
      text: vi.fn(),
    },
    status: { spinner: { message: vi.fn(), start: vi.fn(), stop: vi.fn() } },
    store: { clear: vi.fn(), delete: vi.fn(), get: vi.fn(), has: vi.fn(), set: vi.fn() },
  } as unknown as CommandContext
}

describe('commands command', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fail when commands directory not found', async () => {
    const ctx = makeContext()
    mockedLoadConfig.mockResolvedValue([null, { config: {} }] as never)
    mockFsExists.mockResolvedValue(false)

    const mod = await import('./commands.js')

    await expect(mod.default.handler!(ctx)).rejects.toThrow('Commands directory not found')
  })

  it('should display "No commands found" when autoload returns empty map', async () => {
    const ctx = makeContext()
    mockedLoadConfig.mockResolvedValue([null, { config: {} }] as never)
    mockFsExists.mockResolvedValue(true)
    mockedAutoload.mockResolvedValue({})

    const mod = await import('./commands.js')
    await mod.default.handler!(ctx)

    expect(ctx.log.raw).toHaveBeenCalledWith('No commands found')
  })

  it('should render single command with description', async () => {
    const ctx = makeContext()
    mockedLoadConfig.mockResolvedValue([null, { config: {} }] as never)
    mockFsExists.mockResolvedValue(true)
    mockedAutoload.mockResolvedValue({
      deploy: { description: 'Deploy the app' },
    } as never)

    const mod = await import('./commands.js')
    await mod.default.handler!(ctx)

    expect(ctx.log.raw).toHaveBeenCalledWith('└── deploy — Deploy the app')
  })

  it('should render command without description', async () => {
    const ctx = makeContext()
    mockedLoadConfig.mockResolvedValue([null, { config: {} }] as never)
    mockFsExists.mockResolvedValue(true)
    mockedAutoload.mockResolvedValue({
      build: {},
    } as never)

    const mod = await import('./commands.js')
    await mod.default.handler!(ctx)

    expect(ctx.log.raw).toHaveBeenCalledWith('└── build')
  })

  it('should render multiple commands sorted alphabetically', async () => {
    const ctx = makeContext()
    mockedLoadConfig.mockResolvedValue([null, { config: {} }] as never)
    mockFsExists.mockResolvedValue(true)
    mockedAutoload.mockResolvedValue({
      add: { description: 'Add' },
      build: { description: 'Build' },
      deploy: { description: 'Deploy' },
    } as never)

    const mod = await import('./commands.js')
    await mod.default.handler!(ctx)

    const expected = ['├── add — Add', '├── build — Build', '└── deploy — Deploy'].join('\n')
    expect(ctx.log.raw).toHaveBeenCalledWith(expected)
  })

  it('should use continuation connector for non-final entries', async () => {
    const ctx = makeContext()
    mockedLoadConfig.mockResolvedValue([null, { config: {} }] as never)
    mockFsExists.mockResolvedValue(true)
    mockedAutoload.mockResolvedValue({
      alpha: { description: 'First' },
      beta: { description: 'Second' },
    } as never)

    const mod = await import('./commands.js')
    await mod.default.handler!(ctx)

    const output = vi.mocked(ctx.log.raw).mock.calls[0]![0] as string
    expect(output).toContain('├── alpha')
  })

  it('should use last-item connector for final entry', async () => {
    const ctx = makeContext()
    mockedLoadConfig.mockResolvedValue([null, { config: {} }] as never)
    mockFsExists.mockResolvedValue(true)
    mockedAutoload.mockResolvedValue({
      alpha: { description: 'First' },
      beta: { description: 'Second' },
    } as never)

    const mod = await import('./commands.js')
    await mod.default.handler!(ctx)

    const output = vi.mocked(ctx.log.raw).mock.calls[0]![0] as string
    expect(output).toContain('└── beta')
  })

  it('should render nested subcommands with tree connectors', async () => {
    const ctx = makeContext()
    mockedLoadConfig.mockResolvedValue([null, { config: {} }] as never)
    mockFsExists.mockResolvedValue(true)
    mockedAutoload.mockResolvedValue({
      parent: {
        commands: {
          child1: { description: 'Child one' },
          child2: { description: 'Child two' },
        },
        description: 'Parent cmd',
      },
    } as never)

    const mod = await import('./commands.js')
    await mod.default.handler!(ctx)

    const expected = [
      '└── parent — Parent cmd',
      '    ├── child1 — Child one',
      '    └── child2 — Child two',
    ].join('\n')
    expect(ctx.log.raw).toHaveBeenCalledWith(expected)
  })

  it('should handle deeply nested commands with three levels', async () => {
    const ctx = makeContext()
    mockedLoadConfig.mockResolvedValue([null, { config: {} }] as never)
    mockFsExists.mockResolvedValue(true)
    mockedAutoload.mockResolvedValue({
      root: {
        commands: {
          mid: {
            commands: {
              leaf: { description: 'Leaf' },
            },
            description: 'Middle',
          },
        },
        description: 'Root',
      },
    } as never)

    const mod = await import('./commands.js')
    await mod.default.handler!(ctx)

    const expected = ['└── root — Root', '    └── mid — Middle', '        └── leaf — Leaf'].join(
      '\n'
    )
    expect(ctx.log.raw).toHaveBeenCalledWith(expected)
  })

  it('should use config commands directory when available', async () => {
    const ctx = makeContext()
    mockedLoadConfig.mockResolvedValue([null, { config: { commands: 'src/cmds' } }] as never)
    mockFsExists.mockResolvedValue(true)
    mockedAutoload.mockResolvedValue({})

    const mod = await import('./commands.js')
    await mod.default.handler!(ctx)

    const autoloadArg = mockedAutoload.mock.calls[0]![0] as { dir: string }
    expect(autoloadArg.dir).toContain('src/cmds')
  })

  it('should default to commands directory when config has no commands field', async () => {
    const ctx = makeContext()
    mockedLoadConfig.mockResolvedValue([null, { config: {} }] as never)
    mockFsExists.mockResolvedValue(true)
    mockedAutoload.mockResolvedValue({})

    const mod = await import('./commands.js')
    await mod.default.handler!(ctx)

    const autoloadArg = mockedAutoload.mock.calls[0]![0] as { dir: string }
    expect(autoloadArg.dir).toContain('commands')
  })

  it('should handle config load error gracefully with defaults', async () => {
    const ctx = makeContext()
    mockedLoadConfig.mockResolvedValue([new Error('no config'), null] as never)
    mockFsExists.mockResolvedValue(true)
    mockedAutoload.mockResolvedValue({})

    const mod = await import('./commands.js')
    await mod.default.handler!(ctx)

    expect(ctx.log.raw).toHaveBeenCalledWith('No commands found')
  })

  it('should render sibling and nested commands with correct prefixes', async () => {
    const ctx = makeContext()
    mockedLoadConfig.mockResolvedValue([null, { config: {} }] as never)
    mockFsExists.mockResolvedValue(true)
    mockedAutoload.mockResolvedValue({
      alpha: {
        commands: {
          sub: { description: 'Sub' },
        },
        description: 'Alpha',
      },
      beta: { description: 'Beta' },
    } as never)

    const mod = await import('./commands.js')
    await mod.default.handler!(ctx)

    const expected = ['├── alpha — Alpha', '│   └── sub — Sub', '└── beta — Beta'].join('\n')
    expect(ctx.log.raw).toHaveBeenCalledWith(expected)
  })

  it('should respect subcommand order when specified', async () => {
    const ctx = makeContext()
    mockedLoadConfig.mockResolvedValue([null, { config: {} }] as never)
    mockFsExists.mockResolvedValue(true)
    mockedAutoload.mockResolvedValue({
      deploy: {
        commands: {
          preview: { description: 'Preview deploy' },
          production: { description: 'Production deploy' },
          staging: { description: 'Staging deploy' },
        },
        description: 'Deploy the app',
        help: { order: ['production', 'preview'] },
      },
    } as never)

    const mod = await import('./commands.js')
    await mod.default.handler!(ctx)

    const expected = [
      '└── deploy — Deploy the app',
      '    ├── production — Production deploy',
      '    ├── preview — Preview deploy',
      '    └── staging — Staging deploy',
    ].join('\n')
    expect(ctx.log.raw).toHaveBeenCalledWith(expected)
  })

  it('should warn and skip unknown names in order array', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const ctx = makeContext()
    mockedLoadConfig.mockResolvedValue([null, { config: {} }] as never)
    mockFsExists.mockResolvedValue(true)
    mockedAutoload.mockResolvedValue({
      parent: {
        commands: {
          alpha: { description: 'Alpha' },
          beta: { description: 'Beta' },
        },
        description: 'Parent',
        help: { order: ['missing', 'alpha'] },
      },
    } as never)

    const mod = await import('./commands.js')
    await mod.default.handler!(ctx)

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('unknown command "missing"'))

    const expected = ['└── parent — Parent', '    ├── alpha — Alpha', '    └── beta — Beta'].join(
      '\n'
    )
    expect(ctx.log.raw).toHaveBeenCalledWith(expected)
    warnSpy.mockRestore()
  })

  it('should warn and skip duplicate names in order array', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const ctx = makeContext()
    mockedLoadConfig.mockResolvedValue([null, { config: {} }] as never)
    mockFsExists.mockResolvedValue(true)
    mockedAutoload.mockResolvedValue({
      parent: {
        commands: {
          alpha: { description: 'Alpha' },
          beta: { description: 'Beta' },
        },
        description: 'Parent',
        help: { order: ['beta', 'alpha', 'beta'] },
      },
    } as never)

    const mod = await import('./commands.js')
    await mod.default.handler!(ctx)

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('duplicate command name "beta"'))

    const expected = ['└── parent — Parent', '    ├── beta — Beta', '    └── alpha — Alpha'].join(
      '\n'
    )
    expect(ctx.log.raw).toHaveBeenCalledWith(expected)
    warnSpy.mockRestore()
  })
})
