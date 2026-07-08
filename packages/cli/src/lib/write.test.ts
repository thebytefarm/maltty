import { beforeEach, describe, expect, it, vi } from 'vitest'

import { writeFiles } from './write.js'

vi.mock(import('node:fs/promises'), () => ({
  access: vi.fn(),
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
}))

const fsp = await import('node:fs/promises')
const mockedAccess = vi.mocked(fsp.access) as unknown as ReturnType<typeof vi.fn>
const mockedWriteFile = vi.mocked(fsp.writeFile) as unknown as ReturnType<typeof vi.fn>
const mockedMkdir = vi.mocked(fsp.mkdir) as unknown as ReturnType<typeof vi.fn>

describe('writeFiles()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedMkdir.mockResolvedValue(undefined)
    mockedWriteFile.mockResolvedValue(undefined)
  })

  it('should write files to correct paths', async () => {
    mockedAccess.mockRejectedValue(new Error('ENOENT'))

    const [error, result] = await writeFiles({
      files: [{ content: 'export {}', relativePath: 'src/index.ts' }],
      outputDir: '/project',
      overwrite: false,
    })

    expect(error).toBeNull()
    expect(result!.written).toStrictEqual(['src/index.ts'])
    expect(result!.skipped).toStrictEqual([])
    expect(mockedWriteFile).toHaveBeenCalledWith('/project/src/index.ts', 'export {}', 'utf8')
  })

  it('should skip existing files when overwrite is false', async () => {
    mockedAccess.mockResolvedValue(undefined)

    const [error, result] = await writeFiles({
      files: [{ content: 'new content', relativePath: 'existing.ts' }],
      outputDir: '/project',
      overwrite: false,
    })

    expect(error).toBeNull()
    expect(result!.written).toStrictEqual([])
    expect(result!.skipped).toStrictEqual(['existing.ts'])
    expect(mockedWriteFile).not.toHaveBeenCalled()
  })

  it('should overwrite existing files when overwrite is true', async () => {
    mockedAccess.mockResolvedValue(undefined)

    const [error, result] = await writeFiles({
      files: [{ content: 'updated', relativePath: 'existing.ts' }],
      outputDir: '/project',
      overwrite: true,
    })

    expect(error).toBeNull()
    expect(result!.written).toStrictEqual(['existing.ts'])
    expect(mockedWriteFile).toHaveBeenCalledWith('/project/existing.ts', 'updated', 'utf8')
  })

  it('should create parent directories', async () => {
    mockedAccess.mockRejectedValue(new Error('ENOENT'))

    await writeFiles({
      files: [{ content: '', relativePath: 'src/deep/file.ts' }],
      outputDir: '/project',
      overwrite: false,
    })

    expect(mockedMkdir).toHaveBeenCalledWith('/project/src/deep', { recursive: true })
  })

  it('should return error result on write failure', async () => {
    mockedAccess.mockRejectedValue(new Error('ENOENT'))
    mockedWriteFile.mockRejectedValue(new Error('Permission denied'))

    const [error, result] = await writeFiles({
      files: [{ content: '', relativePath: 'fail.ts' }],
      outputDir: '/project',
      overwrite: false,
    })

    expect(error).not.toBeNull()
    expect(error!.type).toBe('write_error')
    expect(result).toBeNull()
  })

  it('should handle multiple files in a single call', async () => {
    mockedAccess.mockRejectedValue(new Error('ENOENT'))

    const [error, result] = await writeFiles({
      files: [
        { content: 'a', relativePath: 'a.ts' },
        { content: 'b', relativePath: 'b.ts' },
        { content: 'c', relativePath: 'c.ts' },
      ],
      outputDir: '/project',
      overwrite: false,
    })

    expect(error).toBeNull()
    expect(result!.written).toStrictEqual(['a.ts', 'b.ts', 'c.ts'])
  })
})
