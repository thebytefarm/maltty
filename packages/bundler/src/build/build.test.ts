import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockFsExists = vi.fn()

vi.mock(import('@maltty/utils/node'), () => ({
  fs: { exists: mockFsExists },
}))

vi.mock(import('tsdown'))

const { build: tsdownBuild } = await import('tsdown')
const { build } = await import('./build.js')

const mockTsdownBuild = vi.mocked(tsdownBuild)

const resolved = {
  entry: '/project/src/index.ts',
  commands: '/project/commands',
  buildOutDir: '/project/dist',
  compileOutDir: '/project/dist',
  build: {
    target: 'node18',
    minify: false,
    sourcemap: true,
    external: [],
    clean: false,
  },
  compile: { targets: [], name: 'cli' },
  include: [],
  cwd: '/project',
  version: '1.0.0',
} as const

beforeEach(() => {
  vi.clearAllMocks()
})

describe('build operation', () => {
  it('should return ok with build output on success', async () => {
    mockTsdownBuild.mockResolvedValueOnce([])
    mockFsExists.mockImplementation((p: string) => Promise.resolve(p.endsWith('index.mjs')))

    const [error, output] = await build({ resolved, compile: false })

    expect(error).toBeNull()
    expect(output).toMatchObject({
      entryFile: expect.stringMatching(/index\.mjs$/),
      outDir: expect.stringContaining('dist'),
      version: '1.0.0',
    })
  })

  it('should return err with Error on tsdown failure', async () => {
    mockTsdownBuild.mockRejectedValueOnce(new Error('tsdown crashed'))
    const [error, output] = await build({ resolved, compile: false })

    expect(output).toBeNull()
    expect(error).toBeInstanceOf(Error)
    expect(error).toMatchObject({ message: expect.stringContaining('tsdown build failed') })
  })

  it('should return err when no entry file is produced', async () => {
    mockTsdownBuild.mockResolvedValueOnce([])
    mockFsExists.mockResolvedValue(false)

    const [error, output] = await build({ resolved, compile: false })

    expect(output).toBeNull()
    expect(error).toBeInstanceOf(Error)
    expect(error).toMatchObject({ message: expect.stringContaining('no entry file') })
  })

  it('should pass inline config to tsdown build', async () => {
    mockTsdownBuild.mockResolvedValueOnce([])
    mockFsExists.mockImplementation((p: string) => Promise.resolve(p.endsWith('index.mjs')))

    const minifyResolved = { ...resolved, build: { ...resolved.build, minify: true } }
    await build({ resolved: minifyResolved, compile: false })

    expect(mockTsdownBuild).toHaveBeenCalledWith(expect.objectContaining({ minify: true }))
  })

  it('should include version from resolved config in build output', async () => {
    mockTsdownBuild.mockResolvedValueOnce([])
    mockFsExists.mockImplementation((p: string) => Promise.resolve(p.endsWith('index.mjs')))

    const versionResolved = { ...resolved, version: '2.5.0' }
    const [, output] = await build({ resolved: versionResolved, compile: false })

    expect(output).toMatchObject({ version: '2.5.0' })
  })

  it('should handle undefined version in resolved config', async () => {
    mockTsdownBuild.mockResolvedValueOnce([])
    mockFsExists.mockImplementation((p: string) => Promise.resolve(p.endsWith('index.mjs')))

    const noVersionResolved = { ...resolved, version: undefined }
    const [error, output] = await build({ resolved: noVersionResolved, compile: false })

    expect(error).toBeNull()
    expect(output).toHaveProperty('version', undefined)
  })

  it('should inject __KIDD_VERSION__ define when version is available', async () => {
    mockTsdownBuild.mockResolvedValueOnce([])
    mockFsExists.mockImplementation((p: string) => Promise.resolve(p.endsWith('index.mjs')))

    const versionResolved = { ...resolved, version: '4.0.0' }
    await build({ resolved: versionResolved, compile: false })

    expect(mockTsdownBuild).toHaveBeenCalledWith(
      expect.objectContaining({ define: { __KIDD_VERSION__: '"4.0.0"' } })
    )
  })
})
