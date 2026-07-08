import { join } from 'node:path'

import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockFsExists = vi.fn()

vi.mock(import('@maltty/utils/node'), () => ({
  fs: { exists: mockFsExists },
}))

const { resolveBuildEntry } = await import('./resolve-build-entry.js')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('resolveBuildEntry', () => {
  it('should return index.mjs when it exists (preferred over index.js)', async () => {
    mockFsExists.mockResolvedValue(true)

    const result = await resolveBuildEntry('/project/dist')

    expect(result).toBe(join('/project/dist', 'index.mjs'))
  })

  it('should return undefined when no entry file exists', async () => {
    mockFsExists.mockResolvedValue(false)

    const result = await resolveBuildEntry('/project/dist')

    expect(result).toBeUndefined()
  })
})
