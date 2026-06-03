import type { CommandContext } from '@maltty/core'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock(import('../../lib/detect.js'), () => ({
  detectProject: vi.fn(),
}))

vi.mock(import('../../lib/render.js'), () => ({
  renderTemplate: vi.fn(),
}))

vi.mock(import('../../lib/write.js'), () => ({
  writeFiles: vi.fn(),
}))

const { detectProject } = await import('../../lib/detect.js')
const { renderTemplate } = await import('../../lib/render.js')
const { writeFiles } = await import('../../lib/write.js')
const mockedDetectProject = vi.mocked(detectProject)
const mockedRenderTemplate = vi.mocked(renderTemplate)
const mockedWriteFiles = vi.mocked(writeFiles)

function makeContext(argOverrides: Record<string, unknown> = {}): CommandContext {
  return {
    args: { description: undefined, name: undefined, ...argOverrides },
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
    meta: { command: ['add', 'middleware'], name: 'maltty', version: '0.0.0' },
    store: { clear: vi.fn(), delete: vi.fn(), get: vi.fn(), has: vi.fn(), set: vi.fn() },
  } as unknown as CommandContext
}

describe('add middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
    vi.mocked(ctx.prompts.text)
      .mockResolvedValueOnce('auth')
      .mockResolvedValueOnce('Authentication middleware')
    mockedRenderTemplate.mockResolvedValue([
      null,
      [{ content: 'code', relativePath: 'middleware.ts' }],
    ])
    mockedWriteFiles.mockResolvedValue([null, { skipped: [], written: ['auth.ts'] }])

    const mod = await import('./middleware.js')
    await mod.default.handler!(ctx)

    expect(ctx.prompts.text).toHaveBeenCalledTimes(2)
  })

  it('should render middleware template with correct variables', async () => {
    const ctx = makeContext({ description: 'Request logging', name: 'logging' })
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
      [{ content: 'code', relativePath: 'middleware.ts' }],
    ])
    mockedWriteFiles.mockResolvedValue([null, { skipped: [], written: ['logging.ts'] }])

    const mod = await import('./middleware.js')
    await mod.default.handler!(ctx)

    expect(mockedRenderTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: { description: 'Request logging', middlewareName: 'logging' },
      })
    )
  })

  it('should rename output file to match middleware name', async () => {
    const ctx = makeContext({ description: 'Auth', name: 'auth' })
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
      [{ content: 'code', relativePath: 'middleware.ts' }],
    ])
    mockedWriteFiles.mockResolvedValue([null, { skipped: [], written: ['auth.ts'] }])

    const mod = await import('./middleware.js')
    await mod.default.handler!(ctx)

    const { files } = mockedWriteFiles.mock.calls[0]![0]!
    expect(files[0]!.relativePath).toBe('auth.ts')
  })

  it('should write to src/middleware directory', async () => {
    const ctx = makeContext({ description: 'Auth', name: 'auth' })
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
      [{ content: 'code', relativePath: 'middleware.ts' }],
    ])
    mockedWriteFiles.mockResolvedValue([null, { skipped: [], written: ['auth.ts'] }])

    const mod = await import('./middleware.js')
    await mod.default.handler!(ctx)

    expect(mockedWriteFiles).toHaveBeenCalledWith(
      expect.objectContaining({ outputDir: '/project/src/middleware' })
    )
  })

  it('should fail when not in a maltty project', async () => {
    const ctx = makeContext({ name: 'auth' })
    mockedDetectProject.mockResolvedValue([null, null])

    const mod = await import('./middleware.js')
    await expect(mod.default.handler!(ctx)).rejects.toThrow('Not in a maltty project')
  })

  it('should fail when detect returns an error', async () => {
    const ctx = makeContext({ name: 'auth' })
    mockedDetectProject.mockResolvedValue([new Error('detect failed'), null])

    const mod = await import('./middleware.js')
    await expect(mod.default.handler!(ctx)).rejects.toThrow('detect failed')
  })

  it('should fail when name is not kebab-case', async () => {
    const ctx = makeContext({ name: 'MyMiddleware' })
    mockedDetectProject.mockResolvedValue([
      null,
      { commandsDir: null, hasMalttyDep: true, rootDir: '/project' },
    ])

    const mod = await import('./middleware.js')
    await expect(mod.default.handler!(ctx)).rejects.toThrow('Middleware name must be kebab-case')
  })

  it('should fail when render returns an error', async () => {
    const ctx = makeContext({ description: 'Auth', name: 'auth' })
    mockedDetectProject.mockResolvedValue([
      null,
      { commandsDir: null, hasMalttyDep: true, rootDir: '/project' },
    ])
    mockedRenderTemplate.mockResolvedValue([new Error('render failed'), null])

    const mod = await import('./middleware.js')
    await expect(mod.default.handler!(ctx)).rejects.toThrow('render failed')
    expect(ctx.status.spinner.stop).toHaveBeenCalledWith('Failed')
  })

  it('should fail when write returns an error', async () => {
    const ctx = makeContext({ description: 'Auth', name: 'auth' })
    mockedDetectProject.mockResolvedValue([
      null,
      { commandsDir: null, hasMalttyDep: true, rootDir: '/project' },
    ])
    mockedRenderTemplate.mockResolvedValue([
      null,
      [{ content: 'code', relativePath: 'middleware.ts' }],
    ])
    mockedWriteFiles.mockResolvedValue([new Error('write failed'), null])

    const mod = await import('./middleware.js')
    await expect(mod.default.handler!(ctx)).rejects.toThrow('write failed')
    expect(ctx.status.spinner.stop).toHaveBeenCalledWith('Failed')
  })

  it('should log skipped files', async () => {
    const ctx = makeContext({ description: 'Auth', name: 'auth' })
    mockedDetectProject.mockResolvedValue([
      null,
      { commandsDir: null, hasMalttyDep: true, rootDir: '/project' },
    ])
    mockedRenderTemplate.mockResolvedValue([
      null,
      [{ content: 'code', relativePath: 'middleware.ts' }],
    ])
    mockedWriteFiles.mockResolvedValue([null, { skipped: ['auth.ts'], written: [] }])

    const mod = await import('./middleware.js')
    await mod.default.handler!(ctx)

    expect(ctx.log.raw).toHaveBeenCalledWith('  skipped auth.ts (already exists)')
  })

  it('should not log summary when no files are written or skipped', async () => {
    const ctx = makeContext({ description: 'Auth', name: 'auth' })
    mockedDetectProject.mockResolvedValue([
      null,
      { commandsDir: null, hasMalttyDep: true, rootDir: '/project' },
    ])
    mockedRenderTemplate.mockResolvedValue([
      null,
      [{ content: 'code', relativePath: 'middleware.ts' }],
    ])
    mockedWriteFiles.mockResolvedValue([null, { skipped: [], written: [] }])

    const mod = await import('./middleware.js')
    await mod.default.handler!(ctx)

    expect(ctx.log.raw).not.toHaveBeenCalled()
  })

  it('should prompt for description when not provided via args', async () => {
    const ctx = makeContext({ name: 'auth' })
    mockedDetectProject.mockResolvedValue([
      null,
      { commandsDir: null, hasMalttyDep: true, rootDir: '/project' },
    ])
    vi.mocked(ctx.prompts.text).mockResolvedValueOnce('Auth middleware')
    mockedRenderTemplate.mockResolvedValue([
      null,
      [{ content: 'code', relativePath: 'middleware.ts' }],
    ])
    mockedWriteFiles.mockResolvedValue([null, { skipped: [], written: ['auth.ts'] }])

    const mod = await import('./middleware.js')
    await mod.default.handler!(ctx)

    expect(ctx.prompts.text).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Description' })
    )
  })
})
