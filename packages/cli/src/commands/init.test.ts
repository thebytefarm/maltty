import type { CommandContext } from 'maltty'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock(import('@maltty/utils/manifest'), () => ({
  readManifest: vi.fn(),
}))

vi.mock(import('../lib/template-versions.js'), () => ({
  readTemplateVersions: vi.fn(
    () =>
      [
        null,
        {
          tsdownVersion: '^0.21.3',
          typescriptVersion: '^5.9.3',
          vitestVersion: '^4.1.0',
          zodVersion: '^4.3.6',
        },
      ] as const
  ),
}))

vi.mock(import('../lib/render.js'), () => ({
  renderTemplate: vi.fn(),
}))

vi.mock(import('../lib/write.js'), () => ({
  writeFiles: vi.fn(),
}))

const { readManifest } = await import('@maltty/utils/manifest')
const { readTemplateVersions } = await import('../lib/template-versions.js')
const { renderTemplate } = await import('../lib/render.js')
const { writeFiles } = await import('../lib/write.js')
const mockedReadManifest = vi.mocked(readManifest)
const mockedReadTemplateVersions = vi.mocked(readTemplateVersions)
const mockedRenderTemplate = vi.mocked(renderTemplate)
const mockedWriteFiles = vi.mocked(writeFiles)

function makeContext(argOverrides: Record<string, unknown> = {}): CommandContext {
  return {
    args: {
      config: undefined,
      description: undefined,
      example: undefined,
      name: undefined,
      pm: undefined,
      ...argOverrides,
    },
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
    meta: { command: ['init'], name: 'maltty', version: '0.0.0' },
    store: { clear: vi.fn(), delete: vi.fn(), get: vi.fn(), has: vi.fn(), set: vi.fn() },
  } as unknown as CommandContext
}

describe('init command', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedReadManifest.mockResolvedValue([
      null,
      {
        author: undefined,
        bin: undefined,
        description: undefined,
        homepage: undefined,
        keywords: [],
        license: undefined,
        name: undefined,
        repository: undefined,
        version: '1.2.3',
      },
    ])
  })

  it('should prompt for missing args', async () => {
    const ctx = makeContext()
    vi.mocked(ctx.prompts.text).mockResolvedValueOnce('my-cli').mockResolvedValueOnce('A test CLI')
    vi.mocked(ctx.prompts.select).mockResolvedValueOnce('pnpm')
    vi.mocked(ctx.prompts.confirm).mockResolvedValueOnce(true).mockResolvedValueOnce(false)
    mockedRenderTemplate.mockResolvedValue([
      null,
      [{ content: '{}', relativePath: 'package.json' }],
    ])
    mockedWriteFiles.mockResolvedValue([null, { skipped: [], written: ['package.json'] }])

    const mod = await import('./init.js')
    await mod.default.handler!(ctx)

    expect(ctx.prompts.text).toHaveBeenCalledTimes(2)
    expect(ctx.prompts.select).toHaveBeenCalledTimes(1)
    expect(ctx.prompts.confirm).toHaveBeenCalledTimes(2)
  })

  it('should use provided args without prompting', async () => {
    const ctx = makeContext({
      config: false,
      description: 'My CLI',
      example: false,
      name: 'my-cli',
      pm: 'pnpm',
    })
    mockedRenderTemplate.mockResolvedValue([
      null,
      [{ content: '{}', relativePath: 'package.json' }],
    ])
    mockedWriteFiles.mockResolvedValue([null, { skipped: [], written: ['package.json'] }])

    const mod = await import('./init.js')
    await mod.default.handler!(ctx)

    expect(ctx.prompts.text).not.toHaveBeenCalled()
    expect(ctx.prompts.select).not.toHaveBeenCalled()
    expect(ctx.prompts.confirm).not.toHaveBeenCalled()
  })

  it('should render project templates with correct variables', async () => {
    const ctx = makeContext({
      config: false,
      description: 'Test',
      example: true,
      name: 'test-cli',
      pm: 'npm',
    })
    mockedRenderTemplate.mockResolvedValue([null, []])
    mockedWriteFiles.mockResolvedValue([null, { skipped: [], written: [] }])

    const mod = await import('./init.js')
    await mod.default.handler!(ctx)

    expect(mockedRenderTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: {
          cliVersion: '1.2.3',
          coreVersion: '1.2.3',
          description: 'Test',
          includeConfig: false,
          name: 'test-cli',
          packageManager: 'npm',
          tsdownVersion: '^0.21.3',
          typescriptVersion: '^5.9.3',
          vitestVersion: '^4.1.0',
          zodVersion: '^4.3.6',
        },
      })
    )
  })

  it('should filter out hello command when example is false', async () => {
    const ctx = makeContext({
      config: false,
      description: 'Test',
      example: false,
      name: 'test-cli',
      pm: 'pnpm',
    })
    mockedRenderTemplate.mockResolvedValue([
      null,
      [
        { content: '{}', relativePath: 'package.json' },
        { content: 'hello', relativePath: 'src/commands/hello.ts' },
      ],
    ])
    mockedWriteFiles.mockResolvedValue([null, { skipped: [], written: ['package.json'] }])

    const mod = await import('./init.js')
    await mod.default.handler!(ctx)

    const writtenFiles = mockedWriteFiles.mock.calls[0]![0]!.files
    expect(writtenFiles).toHaveLength(1)
    expect(writtenFiles[0]!.relativePath).toBe('package.json')
  })

  it('should call fail on render error', async () => {
    const ctx = makeContext({
      config: false,
      description: 'Test',
      example: false,
      name: 'test-cli',
      pm: 'pnpm',
    })
    mockedRenderTemplate.mockResolvedValue([
      { message: 'bad template', type: 'render_error' },
      null,
    ])

    const mod = await import('./init.js')
    await expect(mod.default.handler!(ctx)).rejects.toThrow('bad template')
  })

  it('should call fail when template versions cannot be read', async () => {
    const ctx = makeContext({
      config: false,
      description: 'Test',
      example: false,
      name: 'test-cli',
      pm: 'pnpm',
    })
    mockedReadTemplateVersions.mockReturnValueOnce([
      new Error('Could not locate pnpm-workspace.yaml'),
      null,
    ])

    const mod = await import('./init.js')
    await expect(mod.default.handler!(ctx)).rejects.toThrow('Could not locate pnpm-workspace.yaml')
  })
})
