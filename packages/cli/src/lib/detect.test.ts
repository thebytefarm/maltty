import { beforeEach, describe, expect, it, vi } from 'vitest'

import { detectProject } from './detect.js'

vi.mock(import('node:fs/promises'), () => ({
  access: vi.fn(),
  readFile: vi.fn(),
}))

const fsp = await import('node:fs/promises')
const mockedAccess = vi.mocked(fsp.access) as unknown as ReturnType<typeof vi.fn>
const mockedReadFile = vi.mocked(fsp.readFile) as unknown as ReturnType<typeof vi.fn>

describe('detectProject()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return null when no package.json exists', async () => {
    mockedAccess.mockRejectedValue(new Error('ENOENT'))

    const [error, result] = await detectProject('/some/dir')

    expect(error).toBeNull()
    expect(result).toBeNull()
  })

  it('should return null when maltty is not in dependencies', async () => {
    mockedAccess.mockResolvedValue(undefined)
    mockedReadFile.mockResolvedValue(
      JSON.stringify({
        dependencies: { express: '^4.0.0' },
        devDependencies: {},
      })
    )

    const [error, result] = await detectProject('/some/dir')

    expect(error).toBeNull()
    expect(result).toBeNull()
  })

  it('should detect maltty project with maltty in dependencies', async () => {
    mockedAccess.mockResolvedValueOnce(undefined).mockResolvedValueOnce(undefined)
    mockedReadFile.mockResolvedValue(
      JSON.stringify({
        dependencies: { '@maltty/core': 'workspace:*' },
      })
    )

    const [error, result] = await detectProject('/my-project')

    expect(error).toBeNull()
    expect(result).not.toBeNull()
    expect(result!.rootDir).toBe('/my-project')
    expect(result!.hasMalttyDep).toBeTruthy()
    expect(result!.commandsDir).toBe('/my-project/src/commands')
  })

  it('should detect maltty project with maltty in devDependencies', async () => {
    mockedAccess.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('ENOENT'))
    mockedReadFile.mockResolvedValue(
      JSON.stringify({
        devDependencies: { '@maltty/core': '^1.0.0' },
      })
    )

    const [error, result] = await detectProject('/my-project')

    expect(error).toBeNull()
    expect(result).not.toBeNull()
    expect(result!.hasMalttyDep).toBeTruthy()
    expect(result!.commandsDir).toBeNull()
  })

  it('should return null commandsDir when src/commands does not exist', async () => {
    mockedAccess.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('ENOENT'))
    mockedReadFile.mockResolvedValue(
      JSON.stringify({
        dependencies: { '@maltty/core': 'workspace:*' },
      })
    )

    const [error, result] = await detectProject('/my-project')

    expect(error).toBeNull()
    expect(result!.commandsDir).toBeNull()
  })

  it('should return error result when reading package.json fails', async () => {
    mockedAccess.mockResolvedValue(undefined)
    mockedReadFile.mockRejectedValue(new Error('Parse error'))

    const [error, result] = await detectProject('/bad-project')

    expect(error).not.toBeNull()
    expect(error!.type).toBe('read_error')
    expect(result).toBeNull()
  })
})
