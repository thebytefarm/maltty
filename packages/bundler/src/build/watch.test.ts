import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock(import('tsdown'))

const { build: tsdownBuild } = await import('tsdown')
const { watch } = await import('./watch.js')

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

describe('watch operation', () => {
  it('should return ok on success', async () => {
    mockTsdownBuild.mockResolvedValueOnce([])
    const [error, output] = await watch({ resolved })

    expect(error).toBeNull()
    expect(output).toBeUndefined()
  })

  it('should return err with Error on failure', async () => {
    mockTsdownBuild.mockRejectedValueOnce(new Error('watch crashed'))
    const [error, output] = await watch({ resolved })

    expect(output).toBeNull()
    expect(error).toBeInstanceOf(Error)
    expect(error!.message).toContain('tsdown watch failed')
  })

  it('should enable watch mode in tsdown config', async () => {
    mockTsdownBuild.mockResolvedValueOnce([])
    await watch({ resolved })

    expect(mockTsdownBuild).toHaveBeenCalledWith(expect.objectContaining({ watch: true }))
  })

  it('should pass onSuccess callback to tsdown config', async () => {
    const onSuccess = vi.fn()
    mockTsdownBuild.mockResolvedValueOnce([])
    await watch({ resolved, onSuccess })

    expect(mockTsdownBuild).toHaveBeenCalledWith(expect.objectContaining({ onSuccess }))
  })

  it('should pass version define to tsdown config', async () => {
    mockTsdownBuild.mockResolvedValueOnce([])

    const versionResolved = { ...resolved, version: '2.0.0' }
    await watch({ resolved: versionResolved })

    expect(mockTsdownBuild).toHaveBeenCalledWith(
      expect.objectContaining({ define: { __MALTTY_VERSION__: '"2.0.0"' } })
    )
  })
})
