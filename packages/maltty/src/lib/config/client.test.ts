import { mkdir, writeFile } from 'node:fs/promises'

import { loadConfig as c12LoadConfig } from 'c12'
import { beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest'
import { z } from 'zod'

import { createConfigClient } from './client.js'
import type { ConfigClientLoadOptions } from './types.js'

vi.mock(import('node:fs/promises'), () => ({
  mkdir: vi.fn(),
  writeFile: vi.fn(),
}))

vi.mock(import('c12'), () => ({
  loadConfig: vi.fn(),
}))

const schema = z.object({
  name: z.string(),
  version: z.number(),
})

const validConfig = {
  name: 'test-app',
  version: 1,
}

const mockC12LoadConfig = vi.mocked(c12LoadConfig)
const mockMkdir = vi.mocked(mkdir)
const mockWriteFile = vi.mocked(writeFile)

describe('config client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockMkdir.mockResolvedValue(undefined)
    mockWriteFile.mockResolvedValue(undefined)
  })

  it('should pass deterministic resolution options to c12', async () => {
    mockC12LoadConfig.mockResolvedValueOnce({
      config: validConfig,
      configFile: '/project/myapp.config.json',
      cwd: '/project',
      layers: [],
    })
    const client = createConfigClient({ name: 'myapp', schema })

    const [error, result] = await client.load('/project')

    expect(error).toBeNull()
    expect(result?.config).toStrictEqual(validConfig)
    expect(mockC12LoadConfig).toHaveBeenCalledWith({
      configFile: 'myapp.config',
      cwd: '/project',
      dotenv: false,
      globalRc: false,
      name: 'myapp',
      packageJson: false,
      rcFile: false,
    })
  })

  it('should accept the exported load options union', () => {
    const client = createConfigClient({ name: 'myapp', schema })
    const loadWithOptions = (options: ConfigClientLoadOptions) => client.load(options)

    expectTypeOf(loadWithOptions).parameter(0).toEqualTypeOf<ConfigClientLoadOptions>()
  })

  it('should write serialized config through the filesystem boundary', async () => {
    const client = createConfigClient({ name: 'myapp', schema })

    const [error, result] = await client.write(validConfig, {
      dir: '/project/config',
      format: 'json',
    })

    expect(error).toBeNull()
    expect(result).toStrictEqual({ filePath: '/project/config/myapp.config.json', format: 'json' })
    expect(mockMkdir).toHaveBeenCalledWith('/project/config', { recursive: true })
    expect(mockWriteFile).toHaveBeenCalledWith(
      '/project/config/myapp.config.json',
      `${JSON.stringify(validConfig, null, 2)}\n`,
      'utf8'
    )
  })
})
