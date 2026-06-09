import type { CommandContext } from 'maltty'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock(import('@maltty/config/utils'), () => ({
  loadConfig: vi.fn(),
}))

vi.mock(import('../../lib/detect.js'), () => ({
  detectProject: vi.fn(),
}))

vi.mock(import('../../lib/render.js'), () => ({
  renderTemplate: vi.fn(),
}))

vi.mock(import('../../lib/write.js'), () => ({
  writeFiles: vi.fn(),
}))

const { loadConfig } = await import('@maltty/config/utils')
const { detectProject } = await import('../../lib/detect.js')
const { renderTemplate } = await import('../../lib/render.js')
const { writeFiles } = await import('../../lib/write.js')
const mockedLoadConfig = vi.mocked(loadConfig)
const mockedDetectProject = vi.mocked(detectProject)
const mockedRenderTemplate = vi.mocked(renderTemplate)
const mockedWriteFiles = vi.mocked(writeFiles)

function makeContext(argOverrides: Record<string, unknown> = {}): CommandContext {
  return {
    args: { args: undefined, description: undefined, name: undefined, ...argOverrides },
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
    prompts: {
      confirm: vi.fn(),
      multiselect: vi.fn(),
      password: vi.fn(),
      select: vi.fn(),
      text: vi.fn(),
    },
    status: { spinner: { message: vi.fn(), start: vi.fn(), stop: vi.fn() } },
    meta: { command: ['add', 'command'], name: 'maltty', version: '0.0.0' },
    store: { clear: vi.fn(), delete: vi.fn(), get: vi.fn(), has: vi.fn(), set: vi.fn() },
  } as unknown as CommandContext
}

describe('add command', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedLoadConfig.mockResolvedValue([new Error('no config'), null])
  })

  it('should use commands dir from maltty config', async () => {
    const ctx = makeContext({ args: true, description: 'Deploy', name: 'deploy' })
    mockedDetectProject.mockResolvedValue([
      null,
      {
        commandsDir: '/project/src/commands',
        hasMalttyDep: true,
        rootDir: '/project',
      },
    ])
    mockedLoadConfig.mockResolvedValue([
      null,
      { config: { commands: 'src/cmds' } as never, configFile: '/project/maltty.config.ts' },
    ])
    mockedRenderTemplate.mockResolvedValue([
      null,
      [{ content: 'code', relativePath: 'command.ts' }],
    ])
    mockedWriteFiles.mockResolvedValue([null, { skipped: [], written: ['deploy.ts'] }])

    const mod = await import('./command.js')
    await mod.default.handler!(ctx)

    expect(mockedWriteFiles).toHaveBeenCalledWith(
      expect.objectContaining({ outputDir: '/project/src/cmds' })
    )
  })

  it('should fall back to default commands dir when no config', async () => {
    const ctx = makeContext({ args: true, description: 'Deploy', name: 'deploy' })
    mockedDetectProject.mockResolvedValue([
      null,
      {
        commandsDir: null,
        hasMalttyDep: true,
        rootDir: '/project',
      },
    ])
    mockedRenderTemplate.mockResolvedValue([
      null,
      [{ content: 'code', relativePath: 'command.ts' }],
    ])
    mockedWriteFiles.mockResolvedValue([null, { skipped: [], written: ['deploy.ts'] }])

    const mod = await import('./command.js')
    await mod.default.handler!(ctx)

    expect(mockedWriteFiles).toHaveBeenCalledWith(
      expect.objectContaining({ outputDir: '/project/commands' })
    )
  })

  it('should prompt for missing args', async () => {
    const ctx = makeContext()
    mockedDetectProject.mockResolvedValue([
      null,
      {
        commandsDir: '/project/src/commands',
        hasMalttyDep: true,
        rootDir: '/project',
      },
    ])
    vi.mocked(ctx.prompts.text).mockResolvedValueOnce('deploy').mockResolvedValueOnce('Deploy app')
    vi.mocked(ctx.prompts.confirm).mockResolvedValueOnce(true)
    mockedRenderTemplate.mockResolvedValue([
      null,
      [{ content: 'code', relativePath: 'command.ts' }],
    ])
    mockedWriteFiles.mockResolvedValue([null, { skipped: [], written: ['deploy.ts'] }])

    const mod = await import('./command.js')
    await mod.default.handler!(ctx)

    expect(ctx.prompts.text).toHaveBeenCalledTimes(2)
    expect(ctx.prompts.confirm).toHaveBeenCalledTimes(1)
  })

  it('should render command template with correct variables', async () => {
    const ctx = makeContext({ args: false, description: 'Build project', name: 'build' })
    mockedDetectProject.mockResolvedValue([
      null,
      {
        commandsDir: '/project/src/commands',
        hasMalttyDep: true,
        rootDir: '/project',
      },
    ])
    mockedRenderTemplate.mockResolvedValue([
      null,
      [{ content: 'code', relativePath: 'command.ts' }],
    ])
    mockedWriteFiles.mockResolvedValue([null, { skipped: [], written: ['build.ts'] }])

    const mod = await import('./command.js')
    await mod.default.handler!(ctx)

    expect(mockedRenderTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: { commandName: 'build', description: 'Build project', includeArgs: false },
      })
    )
  })

  it('should fail when not in a maltty project', async () => {
    const ctx = makeContext({ name: 'deploy' })
    mockedDetectProject.mockResolvedValue([null, null])

    const mod = await import('./command.js')
    await expect(mod.default.handler!(ctx)).rejects.toThrow('Not in a maltty project')
  })

  it('should rename output file to match command name', async () => {
    const ctx = makeContext({ args: false, description: 'Deploy', name: 'deploy' })
    mockedDetectProject.mockResolvedValue([
      null,
      {
        commandsDir: '/project/src/commands',
        hasMalttyDep: true,
        rootDir: '/project',
      },
    ])
    mockedRenderTemplate.mockResolvedValue([
      null,
      [{ content: 'code', relativePath: 'command.ts' }],
    ])
    mockedWriteFiles.mockResolvedValue([null, { skipped: [], written: ['deploy.ts'] }])

    const mod = await import('./command.js')
    await mod.default.handler!(ctx)

    const { files } = mockedWriteFiles.mock.calls[0]![0]!
    expect(files[0]!.relativePath).toBe('deploy.ts')
  })
})
