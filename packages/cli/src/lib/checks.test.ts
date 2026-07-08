import { access, mkdir, readFile, writeFile } from 'node:fs/promises'

import type { LoadConfigResult } from '@maltty/config/utils'
import type { Manifest } from '@maltty/utils/manifest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { CheckContext, RawPackageJson } from './checks.js'
import { CHECKS, createCheckContext, readRawPackageJson } from './checks.js'

vi.mock(import('node:fs/promises'), () => ({
  access: vi.fn(),
  mkdir: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
}))

const mockedAccess = vi.mocked(access) as unknown as ReturnType<typeof vi.fn>
const mockedMkdir = vi.mocked(mkdir) as unknown as ReturnType<typeof vi.fn>
const mockedReadFile = vi.mocked(readFile) as unknown as ReturnType<typeof vi.fn>
const mockedWriteFile = vi.mocked(writeFile) as unknown as ReturnType<typeof vi.fn>

function makeContext(overrides: Partial<CheckContext> = {}): CheckContext {
  return createCheckContext({
    configError: null,
    configResult: null,
    cwd: '/project',
    manifest: null,
    rawPackageJson: null,
    ...overrides,
  })
}

function makeConfigResult(overrides: Partial<LoadConfigResult> = {}): LoadConfigResult {
  return {
    config: {} as LoadConfigResult['config'],
    configFile: '/project/maltty.config.ts',
    ...overrides,
  }
}

function makeManifest(overrides: Partial<Manifest> = {}): Manifest {
  return {
    author: undefined,
    bin: undefined,
    description: undefined,
    homepage: undefined,
    keywords: [],
    license: undefined,
    name: 'test-pkg',
    repository: undefined,
    version: '1.0.0',
    ...overrides,
  }
}

function findCheck(name: string) {
  const check = CHECKS.find((c) => c.name === name)
  if (!check) {
    return undefined as never
  }
  return check
}

describe(createCheckContext, () => {
  it('should create context with provided parameters', () => {
    const configResult = makeConfigResult()
    const manifest = makeManifest()
    const rawPackageJson: RawPackageJson = { type: 'module' }

    const context = createCheckContext({
      configError: null,
      configResult,
      cwd: '/my-project',
      manifest,
      rawPackageJson,
    })

    expect(context.cwd).toBe('/my-project')
    expect(context.configResult).toBe(configResult)
    expect(context.configError).toBeNull()
    expect(context.manifest).toBe(manifest)
    expect(context.rawPackageJson).toBe(rawPackageJson)
  })
})

describe(readRawPackageJson, () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return parsed package.json data', async () => {
    mockedReadFile.mockResolvedValue(
      JSON.stringify({ dependencies: { maltty: '1.0.0' }, type: 'module' })
    )

    const [error, result] = await readRawPackageJson('/project')

    expect(error).toBeNull()
    expect(result).toMatchObject({ dependencies: { maltty: '1.0.0' }, type: 'module' })
  })

  it('should return error when file read fails', async () => {
    mockedReadFile.mockRejectedValue(new Error('ENOENT'))

    const [error, result] = await readRawPackageJson('/missing')

    expect(error).not.toBeNull()
    expect(result).toBeNull()
  })

  it('should return error when JSON is invalid', async () => {
    mockedReadFile.mockResolvedValue('not valid json {{{')

    const [error, result] = await readRawPackageJson('/project')

    expect(error).not.toBeNull()
    expect(result).toBeNull()
  })
})

describe('diagnostic checks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('maltty.config', () => {
    it('should pass when configResult has configFile', async () => {
      const context = makeContext({
        configResult: makeConfigResult({ configFile: '/project/maltty.config.ts' }),
      })

      const result = await findCheck('maltty.config').run(context)

      expect(result.status).toBe('pass')
      expect(result.name).toBe('maltty.config')
    })

    it('should fail when no configResult', async () => {
      const context = makeContext()

      const result = await findCheck('maltty.config').run(context)

      expect(result.status).toBe('fail')
      expect(result.name).toBe('maltty.config')
    })
  })

  describe('config schema', () => {
    it('should pass when configResult exists', async () => {
      const context = makeContext({ configResult: makeConfigResult() })

      const result = await findCheck('config schema').run(context)

      expect(result.status).toBe('pass')
    })

    it('should fail when configError exists', async () => {
      const context = makeContext({ configError: new Error('bad schema') })

      const result = await findCheck('config schema').run(context)

      expect(result.status).toBe('fail')
      expect(result.message).toContain('bad schema')
    })

    it('should warn when neither configResult nor configError', async () => {
      const context = makeContext()

      const result = await findCheck('config schema').run(context)

      expect(result.status).toBe('warn')
    })
  })

  describe('package.json', () => {
    it('should pass when rawPackageJson exists', async () => {
      const context = makeContext({ rawPackageJson: { type: 'module' } })

      const result = await findCheck('package.json').run(context)

      expect(result.status).toBe('pass')
    })

    it('should fail when rawPackageJson is null', async () => {
      const context = makeContext()

      const result = await findCheck('package.json').run(context)

      expect(result.status).toBe('fail')
    })
  })

  describe('package version', () => {
    it('should pass when manifest has version', async () => {
      const context = makeContext({ manifest: makeManifest({ version: '2.0.0' }) })

      const result = await findCheck('package version').run(context)

      expect(result.status).toBe('pass')
      expect(result.message).toBe('2.0.0')
    })

    it('should warn when no version', async () => {
      const context = makeContext({ manifest: makeManifest({ version: undefined }) })

      const result = await findCheck('package version').run(context)

      expect(result.status).toBe('warn')
    })
  })

  describe('module type', () => {
    it('should pass when type is module', async () => {
      const context = makeContext({ rawPackageJson: { type: 'module' } })

      const result = await findCheck('module type').run(context)

      expect(result.status).toBe('pass')
    })

    it('should fail when type is missing', async () => {
      const context = makeContext({ rawPackageJson: {} })

      const result = await findCheck('module type').run(context)

      expect(result.status).toBe('fail')
    })
  })

  describe('maltty dependency', () => {
    it('should pass when maltty is in dependencies', async () => {
      const context = makeContext({
        rawPackageJson: { dependencies: { maltty: '1.0.0' } },
      })

      const result = await findCheck('maltty dependency').run(context)

      expect(result.status).toBe('pass')
      expect(result.message).toContain('dependencies')
    })

    it('should pass when maltty is in devDependencies', async () => {
      const context = makeContext({
        rawPackageJson: { devDependencies: { maltty: '^1.0.0' } },
      })

      const result = await findCheck('maltty dependency').run(context)

      expect(result.status).toBe('pass')
      expect(result.message).toContain('devDependencies')
    })

    it('should fail when maltty not found', async () => {
      const context = makeContext({
        rawPackageJson: { dependencies: { express: '4.0.0' } },
      })

      const result = await findCheck('maltty dependency').run(context)

      expect(result.status).toBe('fail')
    })

    it('should fail when no rawPackageJson', async () => {
      const context = makeContext()

      const result = await findCheck('maltty dependency').run(context)

      expect(result.status).toBe('fail')
    })
  })

  describe('entry point', () => {
    it('should pass when entry file exists', async () => {
      mockedAccess.mockResolvedValue(undefined)
      const context = makeContext({ configResult: makeConfigResult() })

      const result = await findCheck('entry point').run(context)

      expect(result.status).toBe('pass')
    })

    it('should fail when entry file does not exist with config', async () => {
      mockedAccess.mockRejectedValue(new Error('ENOENT'))
      const context = makeContext({ configResult: makeConfigResult() })

      const result = await findCheck('entry point').run(context)

      expect(result.status).toBe('fail')
    })

    it('should warn when no config and default entry not found', async () => {
      mockedAccess.mockRejectedValue(new Error('ENOENT'))
      const context = makeContext()

      const result = await findCheck('entry point').run(context)

      expect(result.status).toBe('warn')
    })
  })

  describe('commands directory', () => {
    it('should pass when commands dir exists', async () => {
      mockedAccess.mockResolvedValue(undefined)
      const context = makeContext({ configResult: makeConfigResult() })

      const result = await findCheck('commands directory').run(context)

      expect(result.status).toBe('pass')
    })

    it('should fail when dir does not exist with config', async () => {
      mockedAccess.mockRejectedValue(new Error('ENOENT'))
      const context = makeContext({ configResult: makeConfigResult() })

      const result = await findCheck('commands directory').run(context)

      expect(result.status).toBe('fail')
    })

    it('should warn when no config and default dir not found', async () => {
      mockedAccess.mockRejectedValue(new Error('ENOENT'))
      const context = makeContext()

      const result = await findCheck('commands directory').run(context)

      expect(result.status).toBe('warn')
    })
  })

  describe('tsconfig.json', () => {
    it('should pass when tsconfig exists', async () => {
      mockedAccess.mockResolvedValue(undefined)
      const context = makeContext()

      const result = await findCheck('tsconfig.json').run(context)

      expect(result.status).toBe('pass')
    })

    it('should warn when tsconfig does not exist', async () => {
      mockedAccess.mockRejectedValue(new Error('ENOENT'))
      const context = makeContext()

      const result = await findCheck('tsconfig.json').run(context)

      expect(result.status).toBe('warn')
    })
  })
})

describe('fix functions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('module type fix', () => {
    it('should add type module to package.json', async () => {
      mockedReadFile.mockResolvedValue(JSON.stringify({ name: 'test' }))
      mockedWriteFile.mockResolvedValue(undefined)
      const context = makeContext()

      const { fix } = findCheck('module type')
      if (!fix) {
        expect.unreachable('fix should be defined')
      }
      const result = await fix(context)

      expect(result.fixed).toBeTruthy()
      expect(result.name).toBe('module type')
      expect(mockedWriteFile).toHaveBeenCalledTimes(1)
    })
  })

  describe('maltty dependency fix', () => {
    it('should add maltty to dependencies', async () => {
      mockedReadFile.mockResolvedValue(JSON.stringify({ name: 'test' }))
      mockedWriteFile.mockResolvedValue(undefined)
      const context = makeContext()

      const { fix } = findCheck('maltty dependency')
      if (!fix) {
        expect.unreachable('fix should be defined')
      }
      const result = await fix(context)

      expect(result.fixed).toBeTruthy()
      expect(result.name).toBe('maltty dependency')
      expect(mockedWriteFile).toHaveBeenCalledTimes(1)
    })
  })

  describe('entry point fix', () => {
    it('should create entry file', async () => {
      mockedMkdir.mockResolvedValue(undefined)
      mockedWriteFile.mockResolvedValue(undefined)
      const context = makeContext()

      const { fix } = findCheck('entry point')
      if (!fix) {
        expect.unreachable('fix should be defined')
      }
      const result = await fix(context)

      expect(result.fixed).toBeTruthy()
      expect(result.name).toBe('entry point')
      expect(mockedMkdir).toHaveBeenCalledTimes(1)
      expect(mockedWriteFile).toHaveBeenCalledTimes(1)
    })
  })

  describe('commands directory fix', () => {
    it('should create directory', async () => {
      mockedMkdir.mockResolvedValue(undefined)
      const context = makeContext()

      const { fix } = findCheck('commands directory')
      if (!fix) {
        expect.unreachable('fix should be defined')
      }
      const result = await fix(context)

      expect(result.fixed).toBeTruthy()
      expect(result.name).toBe('commands directory')
      expect(mockedMkdir).toHaveBeenCalledTimes(1)
    })
  })
})
