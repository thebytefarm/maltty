import type { CommandContext } from '@kidd-cli/core'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockBuild = vi.fn()
const mockCompile = vi.fn()

vi.mock(import('@kidd-cli/bundler'), async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    createBundler: vi.fn(async () => ({
      build: mockBuild,
      compile: mockCompile,
      watch: vi.fn(),
    })),
  }
})

vi.mock(import('@kidd-cli/config/utils'), () => ({
  loadConfig: vi.fn(),
}))

vi.mock(import('@kidd-cli/core'), () => ({
  command: vi.fn((def) => def),
}))

const { createBundler } = await import('@kidd-cli/bundler')
const { loadConfig } = await import('@kidd-cli/config/utils')

const mockedCreateBundler = vi.mocked(createBundler)
const mockedLoadConfig = vi.mocked(loadConfig)

function makeContext(argOverrides: Record<string, unknown> = {}): CommandContext {
  return {
    args: {
      compile: undefined,
      targets: undefined,
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
    meta: { command: ['build'], name: 'kidd', version: '0.0.0' },
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

function setupBuildSuccess(): void {
  mockBuild.mockResolvedValue([
    null,
    { entryFile: '/project/dist/index.js', outDir: '/project/dist', version: '1.0.0', define: {} },
  ])
}

function setupCompileSuccess(): void {
  mockCompile.mockResolvedValue([
    null,
    {
      binaries: [
        {
          label: 'linux-x64',
          path: '/project/dist/bin/cli-linux-x64',
          target: 'linux-x64' as const,
        },
      ],
    },
  ])
}

describe('build command', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('process', { ...process, cwd: () => '/project' })
    mockedLoadConfig.mockResolvedValue([
      null,
      { config: {}, configFile: '/project/kidd.config.ts' },
    ] as never)
    mockedCreateBundler.mockResolvedValue({
      build: mockBuild,
      compile: mockCompile,
      watch: vi.fn(),
    })
  })

  describe('resolveCompileIntent', () => {
    it('should not compile when no flags and no config compile', async () => {
      const ctx = makeContext()
      setupBuildSuccess()

      const mod = await import('./build.js')
      await mod.default.handler!(ctx)

      expect(mockCompile).not.toHaveBeenCalled()
      expect(ctx.status.spinner.stop).toHaveBeenCalledWith('Build complete')
    })

    it('should compile when --targets is provided', async () => {
      const ctx = makeContext({ targets: ['darwin-arm64'] })
      setupBuildSuccess()
      setupCompileSuccess()

      const mod = await import('./build.js')
      await mod.default.handler!(ctx)

      expect(mockCompile).toHaveBeenCalled()
    })

    it('should compile when --compile is true', async () => {
      const ctx = makeContext({ compile: true })
      setupBuildSuccess()
      setupCompileSuccess()

      const mod = await import('./build.js')
      await mod.default.handler!(ctx)

      expect(mockCompile).toHaveBeenCalled()
    })

    it('should not compile when --compile is false', async () => {
      const ctx = makeContext({ compile: false })
      setupBuildSuccess()

      const mod = await import('./build.js')
      await mod.default.handler!(ctx)

      expect(mockCompile).not.toHaveBeenCalled()
    })

    it('should compile when config.compile is true', async () => {
      const ctx = makeContext()
      mockedLoadConfig.mockResolvedValue([
        null,
        { config: { compile: true }, configFile: '/project/kidd.config.ts' },
      ] as never)
      setupBuildSuccess()
      setupCompileSuccess()

      const mod = await import('./build.js')
      await mod.default.handler!(ctx)

      expect(mockCompile).toHaveBeenCalled()
    })

    it('should compile when config.compile is an object', async () => {
      const ctx = makeContext()
      mockedLoadConfig.mockResolvedValue([
        null,
        {
          config: { compile: { targets: ['linux-x64' as const] } },
          configFile: '/project/kidd.config.ts',
        },
      ] as never)
      setupBuildSuccess()
      setupCompileSuccess()

      const mod = await import('./build.js')
      await mod.default.handler!(ctx)

      expect(mockCompile).toHaveBeenCalled()
    })
  })

  describe('mergeCompileTargets', () => {
    it('should use config targets when no CLI targets are provided', async () => {
      const ctx = makeContext({ compile: true })
      mockedLoadConfig.mockResolvedValue([
        null,
        {
          config: { compile: { targets: ['linux-x64' as const] } },
          configFile: '/project/kidd.config.ts',
        },
      ] as never)
      setupBuildSuccess()
      setupCompileSuccess()

      const mod = await import('./build.js')
      await mod.default.handler!(ctx)

      const bundlerCall = mockedCreateBundler.mock.calls[0]![0]!
      expect(bundlerCall.config).toMatchObject({
        compile: { targets: ['linux-x64'] },
      })
    })

    it('should override config targets with CLI targets', async () => {
      const ctx = makeContext({ targets: ['darwin-arm64', 'linux-x64'] })
      mockedLoadConfig.mockResolvedValue([
        null,
        {
          config: { compile: { targets: ['windows-x64' as const] } },
          configFile: '/project/kidd.config.ts',
        },
      ] as never)
      setupBuildSuccess()
      setupCompileSuccess()

      const mod = await import('./build.js')
      await mod.default.handler!(ctx)

      const bundlerCall = mockedCreateBundler.mock.calls[0]![0]!
      expect(bundlerCall.config).toMatchObject({
        compile: { targets: ['darwin-arm64', 'linux-x64'] },
      })
    })
  })

  describe('formatBuildNote', () => {
    it('should display relative entry and output paths', async () => {
      const ctx = makeContext()
      setupBuildSuccess()

      const mod = await import('./build.js')
      await mod.default.handler!(ctx)

      const noteCall = vi.mocked(ctx.log.note).mock.calls[0]!
      expect(noteCall[0]).toContain('entry    dist/index.js')
      expect(noteCall[0]).toContain('output   dist')
      expect(noteCall[0]).toContain('version  1.0.0')
      expect(noteCall[1]).toBe('Bundle')
    })
  })

  describe('formatBinariesNote', () => {
    it('should display aligned binary labels and paths', async () => {
      const ctx = makeContext({ compile: true })
      mockedLoadConfig.mockResolvedValue([
        null,
        { config: { compile: true }, configFile: '/project/kidd.config.ts' },
      ] as never)
      setupBuildSuccess()
      mockCompile.mockResolvedValue([
        null,
        {
          binaries: [
            {
              label: 'macOS ARM64',
              path: '/project/dist/bin/cli-darwin-arm64',
              target: 'darwin-arm64' as const,
            },
            {
              label: 'Linux x64',
              path: '/project/dist/bin/cli-linux-x64',
              target: 'linux-x64' as const,
            },
          ],
        },
      ])

      const mod = await import('./build.js')
      await mod.default.handler!(ctx)

      const mockNote = ctx.log.note as ReturnType<typeof vi.fn>
      const binariesNote = mockNote.mock.calls.find((call) => call[1] === 'Binaries')
      expect(binariesNote).toBeDefined()
      if (!binariesNote) {
        return
      }
      const noteBody = binariesNote[0] as string
      expect(noteBody).toContain('macOS ARM64')
      expect(noteBody).toContain('Linux x64')
      expect(noteBody).toContain('dist/bin/cli-darwin-arm64')
      expect(noteBody).toContain('dist/bin/cli-linux-x64')
    })
  })

  describe('extractConfig', () => {
    it('should use config from loadConfig result', async () => {
      const ctx = makeContext()
      mockedLoadConfig.mockResolvedValue([
        null,
        { config: { entry: './src/main.ts' }, configFile: '/project/kidd.config.ts' },
      ] as never)
      setupBuildSuccess()

      const mod = await import('./build.js')
      await mod.default.handler!(ctx)

      expect(mockedCreateBundler).toHaveBeenCalledWith(
        expect.objectContaining({ config: { entry: './src/main.ts' } })
      )
    })

    it('should fall back to empty config when loadConfig returns error', async () => {
      const ctx = makeContext()
      mockedLoadConfig.mockResolvedValue([new Error('no config'), null] as never)
      setupBuildSuccess()

      const mod = await import('./build.js')
      await mod.default.handler!(ctx)

      expect(mockedCreateBundler).toHaveBeenCalledWith(expect.objectContaining({ config: {} }))
    })
  })

  describe('verbose forwarding', () => {
    it('should pass verbose=true through to bundler.build', async () => {
      const ctx = makeContext({ verbose: true })
      setupBuildSuccess()

      const mod = await import('./build.js')
      await mod.default.handler!(ctx)

      expect(mockBuild).toHaveBeenCalledWith({ verbose: true })
    })

    it('should pass verbose=undefined through to bundler.build by default', async () => {
      const ctx = makeContext()
      setupBuildSuccess()

      const mod = await import('./build.js')
      await mod.default.handler!(ctx)

      expect(mockBuild).toHaveBeenCalledWith({ verbose: undefined })
    })

    it('should pass verbose=true through to bundler.compile', async () => {
      const ctx = makeContext({ compile: true, verbose: true })
      setupBuildSuccess()
      setupCompileSuccess()

      const mod = await import('./build.js')
      await mod.default.handler!(ctx)

      expect(mockCompile).toHaveBeenCalledWith({ verbose: true })
    })
  })

  describe('error handling', () => {
    it('should call fail when build returns an error', async () => {
      const ctx = makeContext()
      mockBuild.mockResolvedValue([new Error('tsdown build failed'), null])

      const mod = await import('./build.js')
      await expect(mod.default.handler!(ctx)).rejects.toThrow('tsdown build failed')

      expect(ctx.status.spinner.stop).toHaveBeenCalledWith('Bundle failed')
    })

    it('should call fail when compile returns an error', async () => {
      const ctx = makeContext({ compile: true })
      setupBuildSuccess()
      mockCompile.mockResolvedValue([new Error('bun compile failed'), null])

      const mod = await import('./build.js')
      await expect(mod.default.handler!(ctx)).rejects.toThrow('bun compile failed')

      expect(ctx.status.spinner.stop).toHaveBeenCalledWith('Compile failed')
    })
  })
})
