import type { CommandContext } from 'maltty'
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

vi.mock(import('@maltty/utils/manifest'), () => ({
  readManifest: vi.fn(),
}))

const { detectProject } = await import('../../lib/detect.js')
const { renderTemplate } = await import('../../lib/render.js')
const { writeFiles } = await import('../../lib/write.js')
const { readManifest } = await import('@maltty/utils/manifest')
const mockedDetectProject = vi.mocked(detectProject)
const mockedRenderTemplate = vi.mocked(renderTemplate)
const mockedWriteFiles = vi.mocked(writeFiles)
const mockedReadManifest = vi.mocked(readManifest)

const mod = await import('./config.js')

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
    prompts: {
      confirm: vi.fn(),
      multiselect: vi.fn(),
      password: vi.fn(),
      select: vi.fn(),
      text: vi.fn(),
    },
    status: { spinner: { message: vi.fn(), start: vi.fn(), stop: vi.fn() } },
    meta: { command: ['add', 'config'], name: 'maltty', version: '0.0.0' },
    store: { clear: vi.fn(), delete: vi.fn(), get: vi.fn(), has: vi.fn(), set: vi.fn() },
  } as unknown as CommandContext
}

describe('add config', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fail when detect returns an error', async () => {
    const ctx = makeContext()
    mockedDetectProject.mockResolvedValue([new Error('detect failed'), null])

    await expect(mod.default.handler!(ctx)).rejects.toThrow('detect failed')
  })

  it('should fail when not in a maltty project', async () => {
    const ctx = makeContext()
    mockedDetectProject.mockResolvedValue([null, null])

    await expect(mod.default.handler!(ctx)).rejects.toThrow('Not in a maltty project')
  })

  it('should resolve project name from package.json', async () => {
    const ctx = makeContext()
    mockedDetectProject.mockResolvedValue([
      null,
      { commandsDir: null, hasMalttyDep: true, rootDir: '/project' },
    ])
    mockedReadManifest.mockResolvedValue([null, { name: 'my-cool-app', version: '1.0.0' }] as never)
    mockedRenderTemplate.mockResolvedValue([null, [{ content: 'code', relativePath: 'config.ts' }]])
    mockedWriteFiles.mockResolvedValue([null, { skipped: [], written: ['config.ts'] }])

    await mod.default.handler!(ctx)

    expect(mockedRenderTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: { name: 'my-cool-app' },
      })
    )
  })

  it('should fall back to default name when readManifest fails', async () => {
    const ctx = makeContext()
    mockedDetectProject.mockResolvedValue([
      null,
      { commandsDir: null, hasMalttyDep: true, rootDir: '/project' },
    ])
    mockedReadManifest.mockResolvedValue([new Error('no manifest'), null] as never)
    mockedRenderTemplate.mockResolvedValue([null, [{ content: 'code', relativePath: 'config.ts' }]])
    mockedWriteFiles.mockResolvedValue([null, { skipped: [], written: ['config.ts'] }])

    await mod.default.handler!(ctx)

    expect(mockedRenderTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: { name: 'my-app' },
      })
    )
  })

  it('should fall back to default name when manifest has no name', async () => {
    const ctx = makeContext()
    mockedDetectProject.mockResolvedValue([
      null,
      { commandsDir: null, hasMalttyDep: true, rootDir: '/project' },
    ])
    mockedReadManifest.mockResolvedValue([null, { version: '1.0.0' }] as never)
    mockedRenderTemplate.mockResolvedValue([null, [{ content: 'code', relativePath: 'config.ts' }]])
    mockedWriteFiles.mockResolvedValue([null, { skipped: [], written: ['config.ts'] }])

    await mod.default.handler!(ctx)

    expect(mockedRenderTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: { name: 'my-app' },
      })
    )
  })

  it('should fail when render returns an error', async () => {
    const ctx = makeContext()
    mockedDetectProject.mockResolvedValue([
      null,
      { commandsDir: null, hasMalttyDep: true, rootDir: '/project' },
    ])
    mockedReadManifest.mockResolvedValue([null, { name: 'app', version: '1.0.0' }] as never)
    mockedRenderTemplate.mockResolvedValue([new Error('render failed'), null])

    await expect(mod.default.handler!(ctx)).rejects.toThrow('render failed')
    expect(ctx.status.spinner.stop).toHaveBeenCalledWith('Failed')
  })

  it('should fail when write returns an error', async () => {
    const ctx = makeContext()
    mockedDetectProject.mockResolvedValue([
      null,
      { commandsDir: null, hasMalttyDep: true, rootDir: '/project' },
    ])
    mockedReadManifest.mockResolvedValue([null, { name: 'app', version: '1.0.0' }] as never)
    mockedRenderTemplate.mockResolvedValue([null, [{ content: 'code', relativePath: 'config.ts' }]])
    mockedWriteFiles.mockResolvedValue([new Error('write failed'), null])

    await expect(mod.default.handler!(ctx)).rejects.toThrow('write failed')
    expect(ctx.status.spinner.stop).toHaveBeenCalledWith('Failed')
  })

  it('should write to src directory', async () => {
    const ctx = makeContext()
    mockedDetectProject.mockResolvedValue([
      null,
      { commandsDir: null, hasMalttyDep: true, rootDir: '/project' },
    ])
    mockedReadManifest.mockResolvedValue([null, { name: 'app', version: '1.0.0' }] as never)
    mockedRenderTemplate.mockResolvedValue([null, [{ content: 'code', relativePath: 'config.ts' }]])
    mockedWriteFiles.mockResolvedValue([null, { skipped: [], written: ['config.ts'] }])

    await mod.default.handler!(ctx)

    expect(mockedWriteFiles).toHaveBeenCalledWith(
      expect.objectContaining({ outputDir: '/project/src' })
    )
  })

  it('should display next steps after creation', async () => {
    const ctx = makeContext()
    mockedDetectProject.mockResolvedValue([
      null,
      { commandsDir: null, hasMalttyDep: true, rootDir: '/project' },
    ])
    mockedReadManifest.mockResolvedValue([null, { name: 'app', version: '1.0.0' }] as never)
    mockedRenderTemplate.mockResolvedValue([null, [{ content: 'code', relativePath: 'config.ts' }]])
    mockedWriteFiles.mockResolvedValue([null, { skipped: [], written: ['config.ts'] }])

    await mod.default.handler!(ctx)

    expect(ctx.log.raw).toHaveBeenCalledWith('Next steps:')
  })

  it('should log skipped files', async () => {
    const ctx = makeContext()
    mockedDetectProject.mockResolvedValue([
      null,
      { commandsDir: null, hasMalttyDep: true, rootDir: '/project' },
    ])
    mockedReadManifest.mockResolvedValue([null, { name: 'app', version: '1.0.0' }] as never)
    mockedRenderTemplate.mockResolvedValue([null, [{ content: 'code', relativePath: 'config.ts' }]])
    mockedWriteFiles.mockResolvedValue([null, { skipped: ['config.ts'], written: [] }])

    await mod.default.handler!(ctx)

    expect(ctx.log.raw).toHaveBeenCalledWith('  skipped config.ts (already exists)')
  })
})
