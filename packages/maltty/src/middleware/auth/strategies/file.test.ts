import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { FileStore } from '@/lib/store/types.js'

vi.mock(import('@/lib/store/create-store.js'), () => ({
  createStore: vi.fn(),
}))

import { createStore } from '@/lib/store/create-store.js'

import { resolveFromFile } from './file.js'

describe('resolveFromFile()', () => {
  const mockStore = {
    load: vi.fn(),
  } as unknown as FileStore

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createStore).mockReturnValue(mockStore)
  })

  it('should return bearer credential when local store loads valid bearer data', () => {
    vi.mocked(mockStore.load).mockReturnValue({ token: 'my-token', type: 'bearer' })

    const result = resolveFromFile({
      filename: 'credentials.json',
      globalDirName: '.my-cli',
      localDirName: '.my-cli',
    })

    expect(result).toEqual({ token: 'my-token', type: 'bearer' })
    expect(createStore).toHaveBeenCalledWith({ dirName: '.my-cli' })
    expect(mockStore.load).toHaveBeenCalledWith('credentials.json', { source: 'local' })
  })

  it('should fall back to global when local returns null', () => {
    vi.mocked(mockStore.load)
      .mockReturnValueOnce(null)
      .mockReturnValueOnce({ token: 'global-token', type: 'bearer' })

    const result = resolveFromFile({
      filename: 'credentials.json',
      globalDirName: '.my-cli-global',
      localDirName: '.my-cli-local',
    })

    expect(result).toEqual({ token: 'global-token', type: 'bearer' })
    expect(createStore).toHaveBeenCalledWith({ dirName: '.my-cli-local' })
    expect(createStore).toHaveBeenCalledWith({ dirName: '.my-cli-global' })
    expect(mockStore.load).toHaveBeenCalledWith('credentials.json', { source: 'local' })
    expect(mockStore.load).toHaveBeenCalledWith('credentials.json', { source: 'global' })
  })

  it('should return null when both local and global return null', () => {
    vi.mocked(mockStore.load).mockReturnValue(null)

    const result = resolveFromFile({
      filename: 'credentials.json',
      globalDirName: '.my-cli',
      localDirName: '.my-cli',
    })

    expect(result).toBeNull()
  })

  it('should return null when store returns data that fails schema validation', () => {
    vi.mocked(mockStore.load).mockReturnValue({ invalid: 'data' })

    const result = resolveFromFile({
      filename: 'credentials.json',
      globalDirName: '.my-cli',
      localDirName: '.my-cli',
    })

    expect(result).toBeNull()
  })

  it('should return basic credential when store loads valid basic auth data', () => {
    vi.mocked(mockStore.load).mockReturnValue({
      password: 's3cret',
      type: 'basic',
      username: 'admin',
    })

    const result = resolveFromFile({
      filename: 'credentials.json',
      globalDirName: '.my-cli',
      localDirName: '.my-cli',
    })

    expect(result).toEqual({ password: 's3cret', type: 'basic', username: 'admin' })
  })
})

describe('resolveFromFile() with different local and global dirs', () => {
  const mockStore = {
    load: vi.fn(),
  } as unknown as FileStore

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createStore).mockReturnValue(mockStore)
  })

  it('should use localDirName for local store and globalDirName for global store', () => {
    vi.mocked(mockStore.load)
      .mockReturnValueOnce(null)
      .mockReturnValueOnce({ token: 'global-tok', type: 'bearer' })

    const result = resolveFromFile({
      filename: 'auth.json',
      globalDirName: '.app-global',
      localDirName: '.app-local',
    })

    expect(createStore).toHaveBeenCalledWith({ dirName: '.app-local' })
    expect(createStore).toHaveBeenCalledWith({ dirName: '.app-global' })
    expect(result).toEqual({ token: 'global-tok', type: 'bearer' })
  })

  it('should resolve from local before trying global when dirs differ', () => {
    vi.mocked(mockStore.load).mockReturnValueOnce({ token: 'local-tok', type: 'bearer' })

    const result = resolveFromFile({
      filename: 'auth.json',
      globalDirName: '.global-dir',
      localDirName: '.local-dir',
    })

    expect(createStore).toHaveBeenCalledTimes(1)
    expect(createStore).toHaveBeenCalledWith({ dirName: '.local-dir' })
    expect(createStore).not.toHaveBeenCalledWith({ dirName: '.global-dir' })
    expect(result).toEqual({ token: 'local-tok', type: 'bearer' })
  })
})
