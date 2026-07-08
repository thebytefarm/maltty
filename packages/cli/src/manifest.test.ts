import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock(import('@maltty/utils/manifest'), () => ({
  readManifest: vi.fn(),
}))

import { readManifest } from '@maltty/utils/manifest'

import { readCLIManifest } from './manifest.js'

const mockReadManifest = vi.mocked(readManifest)

describe('readCLIManifest()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return CLIManifest with all required fields', async () => {
    mockReadManifest.mockResolvedValue([
      null,
      {
        author: undefined,
        bin: undefined,
        description: 'A test CLI tool',
        homepage: undefined,
        keywords: [],
        license: undefined,
        name: 'my-cli',
        repository: undefined,
        version: '1.0.0',
      },
    ])

    const [error, result] = await readCLIManifest('/project/dist')

    expect(error).toBeNull()
    expect(result).toEqual({
      description: 'A test CLI tool',
      name: 'my-cli',
      version: '1.0.0',
    })
    expect(mockReadManifest).toHaveBeenCalledWith('/project')
  })

  it('should return error when readManifest returns error', async () => {
    mockReadManifest.mockResolvedValue([new Error('read failed'), null])

    const [error] = await readCLIManifest('/project/dist')

    expect(error).toBeInstanceOf(Error)
    if (error === null) {
      return
    }
    expect(error.message).toContain('Failed to read CLI manifest: read failed')
  })

  it('should return error when name is missing', async () => {
    mockReadManifest.mockResolvedValue([
      null,
      {
        author: undefined,
        bin: undefined,
        description: 'A test CLI tool',
        homepage: undefined,
        keywords: [],
        license: undefined,
        name: undefined,
        repository: undefined,
        version: '1.0.0',
      },
    ])

    const [error] = await readCLIManifest('/project/dist')

    expect(error).toBeInstanceOf(Error)
    if (error === null) {
      return
    }
    expect(error.message).toContain('CLI manifest is missing required field: name')
  })

  it('should return error when version is missing', async () => {
    mockReadManifest.mockResolvedValue([
      null,
      {
        author: undefined,
        bin: undefined,
        description: 'A test CLI tool',
        homepage: undefined,
        keywords: [],
        license: undefined,
        name: 'my-cli',
        repository: undefined,
        version: undefined,
      },
    ])

    const [error] = await readCLIManifest('/project/dist')

    expect(error).toBeInstanceOf(Error)
    if (error === null) {
      return
    }
    expect(error.message).toContain('CLI manifest is missing required field: version')
  })

  it('should return error when description is missing', async () => {
    mockReadManifest.mockResolvedValue([
      null,
      {
        author: undefined,
        bin: undefined,
        description: undefined,
        homepage: undefined,
        keywords: [],
        license: undefined,
        name: 'my-cli',
        repository: undefined,
        version: '1.0.0',
      },
    ])

    const [error] = await readCLIManifest('/project/dist')

    expect(error).toBeInstanceOf(Error)
    if (error === null) {
      return
    }
    expect(error.message).toContain('CLI manifest is missing required field: description')
  })
})
