import { chmodSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { z } from 'zod'

import { createConfigClient } from './client.js'

const schema = z.object({
  features: z.array(z.string()).optional(),
  name: z.string(),
  version: z.number(),
})

type TestConfig = z.infer<typeof schema>

const validConfig: TestConfig = {
  features: ['auth', 'logging'],
  name: 'test-app',
  version: 1,
}

function createTmpDir(): string {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'maltty-config-')))
  mkdirSync(join(dir, '.git'), { recursive: true })
  return dir
}

describe('config', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = createTmpDir()
  })

  afterEach(() => {
    rmSync(tmpDir, { force: true, recursive: true })
  })

  describe('find', () => {
    it('should find myapp.config.json via c12 (long form)', async () => {
      const client = createConfigClient({ name: 'myapp', schema })
      writeFileSync(join(tmpDir, 'myapp.config.json'), JSON.stringify(validConfig, null, 2))

      const result = await client.find(tmpDir)

      expect(result).toBe(join(tmpDir, 'myapp.config.json'))
    })

    it('should find myapp.config.jsonc via c12 (long form)', async () => {
      const client = createConfigClient({ name: 'myapp', schema })
      writeFileSync(join(tmpDir, 'myapp.config.jsonc'), JSON.stringify(validConfig, null, 2))

      const result = await client.find(tmpDir)

      expect(result).toBe(join(tmpDir, 'myapp.config.jsonc'))
    })

    it('should find myapp.json via c12 (short form)', async () => {
      const client = createConfigClient({ name: 'myapp', schema })
      writeFileSync(join(tmpDir, 'myapp.json'), JSON.stringify(validConfig, null, 2))

      const result = await client.find(tmpDir)

      expect(result).toBe(join(tmpDir, 'myapp.json'))
    })

    it('should find myapp.yaml via c12 (short form)', async () => {
      const client = createConfigClient({ name: 'myapp', schema })
      writeFileSync(join(tmpDir, 'myapp.yaml'), 'name: test-app\nversion: 1\n')

      const result = await client.find(tmpDir)

      expect(result).toBe(join(tmpDir, 'myapp.yaml'))
    })

    it('should find myapp.jsonc via c12 (short form)', async () => {
      const client = createConfigClient({ name: 'myapp', schema })
      writeFileSync(
        join(tmpDir, 'myapp.jsonc'),
        '{ /* comment */ "name": "test-app", "version": 1 }'
      )

      const result = await client.find(tmpDir)

      expect(result).toBe(join(tmpDir, 'myapp.jsonc'))
    })

    it('should reject myapp.ts via short form (TS not allowed)', async () => {
      const client = createConfigClient({ name: 'myapp', schema })
      writeFileSync(join(tmpDir, 'myapp.ts'), 'export default { name: "test-app", version: 1 }')

      const result = await client.find(tmpDir)

      expect(result).toBeNull()
    })

    it('should prefer name.config.* over name.*', async () => {
      const client = createConfigClient({ name: 'myapp', schema })
      writeFileSync(join(tmpDir, 'myapp.json'), JSON.stringify({ name: 'short', version: 1 }))
      writeFileSync(join(tmpDir, 'myapp.config.json'), JSON.stringify(validConfig, null, 2))

      const result = await client.find(tmpDir)

      expect(result).toBe(join(tmpDir, 'myapp.config.json'))
    })

    it('should search searchPaths first', async () => {
      const searchDir = join(tmpDir, 'custom-search')
      mkdirSync(searchDir, { recursive: true })
      writeFileSync(join(searchDir, 'myapp.config.json'), JSON.stringify(validConfig, null, 2))
      writeFileSync(join(tmpDir, 'myapp.config.json'), JSON.stringify(validConfig, null, 2))

      const client = createConfigClient({
        name: 'myapp',
        schema,
        searchPaths: [searchDir],
      })

      const result = await client.find(tmpDir)

      expect(result).toBe(join(searchDir, 'myapp.config.json'))
    })

    it('should return null when no config found', async () => {
      const client = createConfigClient({ name: 'myapp', schema })

      const result = await client.find(tmpDir)

      expect(result).toBeNull()
    })

    it('should handle empty searchPaths array', async () => {
      const client = createConfigClient({ name: 'myapp', schema, searchPaths: [] })
      writeFileSync(join(tmpDir, 'myapp.config.json'), JSON.stringify(validConfig, null, 2))

      const result = await client.find(tmpDir)

      expect(result).toBe(join(tmpDir, 'myapp.config.json'))
    })

    it('should find short-form config in searchPaths', async () => {
      const searchDir = join(tmpDir, 'search-short')
      mkdirSync(searchDir, { recursive: true })
      writeFileSync(join(searchDir, 'myapp.json'), JSON.stringify(validConfig, null, 2))

      const client = createConfigClient({
        name: 'myapp',
        schema,
        searchPaths: [searchDir],
      })

      const result = await client.find(tmpDir)

      expect(result).toBe(join(searchDir, 'myapp.json'))
    })

    it('should find config from the factory cwd by default', async () => {
      writeFileSync(join(tmpDir, 'myapp.config.json'), JSON.stringify(validConfig))
      const client = createConfigClient({ cwd: tmpDir, name: 'myapp', schema })

      const result = await client.find()

      expect(result).toBe(join(tmpDir, 'myapp.config.json'))
    })
  })

  describe('load', () => {
    it('should load and validate JSON config via long form', async () => {
      const client = createConfigClient({ name: 'myapp', schema })
      writeFileSync(join(tmpDir, 'myapp.config.json'), JSON.stringify(validConfig, null, 2))

      const [error, result] = await client.load(tmpDir)

      expect(error).toBeNull()
      expect(result).not.toBeNull()
      expect(result!.config).toStrictEqual(validConfig)
      expect(result!.filePath).toBe(join(tmpDir, 'myapp.config.json'))
      expect(result!.format).toBe('json')
    })

    it('should load config from the factory cwd by default', async () => {
      writeFileSync(join(tmpDir, 'myapp.config.json'), JSON.stringify(validConfig))
      const client = createConfigClient({ cwd: tmpDir, name: 'myapp', schema })

      const [error, result] = await client.load()

      expect(error).toBeNull()
      expect(result?.config).toStrictEqual(validConfig)
      expect(result?.filePath).toBe(join(tmpDir, 'myapp.config.json'))
    })

    it('should load and validate JSONC config via long form', async () => {
      const client = createConfigClient({ name: 'myapp', schema })
      const jsoncContent = `{
  // This is a comment
  "name": "test-app",
  "version": 1,
  "features": ["auth", "logging"]
}`
      writeFileSync(join(tmpDir, 'myapp.config.jsonc'), jsoncContent)

      const [error, result] = await client.load(tmpDir)

      expect(error).toBeNull()
      expect(result).not.toBeNull()
      expect(result!.config).toStrictEqual(validConfig)
      expect(result!.filePath).toBe(join(tmpDir, 'myapp.config.jsonc'))
      expect(result!.format).toBe('jsonc')
    })

    it('should load JSON config via short form', async () => {
      const client = createConfigClient({ name: 'myapp', schema })
      writeFileSync(join(tmpDir, 'myapp.json'), JSON.stringify(validConfig, null, 2))

      const [error, result] = await client.load(tmpDir)

      expect(error).toBeNull()
      expect(result).not.toBeNull()
      expect(result!.config).toStrictEqual(validConfig)
      expect(result!.filePath).toBe(join(tmpDir, 'myapp.json'))
      expect(result!.format).toBe('json')
    })

    it('should load YAML config via short form', async () => {
      const client = createConfigClient({ name: 'myapp', schema })
      const yamlContent = `name: test-app
version: 1
features:
  - auth
  - logging
`
      writeFileSync(join(tmpDir, 'myapp.yaml'), yamlContent)

      const [error, result] = await client.load(tmpDir)

      expect(error).toBeNull()
      expect(result).not.toBeNull()
      expect(result!.config).toStrictEqual(validConfig)
      expect(result!.filePath).toBe(join(tmpDir, 'myapp.yaml'))
      expect(result!.format).toBe('yaml')
    })

    it('should prefer long form over short form when loading', async () => {
      const client = createConfigClient({ name: 'myapp', schema })
      writeFileSync(join(tmpDir, 'myapp.json'), JSON.stringify({ name: 'short', version: 1 }))
      writeFileSync(join(tmpDir, 'myapp.config.json'), JSON.stringify(validConfig, null, 2))

      const [error, result] = await client.load(tmpDir)

      expect(error).toBeNull()
      expect(result).not.toBeNull()
      expect(result!.config.name).toBe('test-app')
      expect(result!.filePath).toBe(join(tmpDir, 'myapp.config.json'))
    })

    it('should not load short-form TS files', async () => {
      const client = createConfigClient({ name: 'myapp', schema })
      writeFileSync(join(tmpDir, 'myapp.ts'), 'export default { name: "test-app", version: 1 }')

      const [error, result] = await client.load(tmpDir)

      expect(error).toBeNull()
      expect(result).toBeNull()
    })

    it('should return [null, null] when no config found', async () => {
      const client = createConfigClient({ name: 'myapp', schema })

      const [error, result] = await client.load(tmpDir)

      expect(error).toBeNull()
      expect(result).toBeNull()
    })

    it('should return Error for schema mismatch', async () => {
      const client = createConfigClient({ name: 'myapp', schema })
      writeFileSync(
        join(tmpDir, 'myapp.config.json'),
        JSON.stringify({ name: 123, version: 'not-a-number' })
      )

      const [error, result] = await client.load(tmpDir)

      expect(result).toBeNull()
      expect(error).toBeInstanceOf(Error)
      expect(error!.message).toContain('Invalid config')
    })

    it('should return Error with validation details for schema mismatch', async () => {
      const client = createConfigClient({ name: 'myapp', schema })
      writeFileSync(
        join(tmpDir, 'myapp.json'),
        JSON.stringify({ name: 123, version: 'not-a-number' })
      )

      const [error, result] = await client.load(tmpDir)

      expect(result).toBeNull()
      expect(error).toBeInstanceOf(Error)
      expect(error!.message).toContain('name')
      expect(error!.message).toContain('version')
    })

    it('should strip extra fields not in schema', async () => {
      const client = createConfigClient({ name: 'myapp', schema })
      writeFileSync(
        join(tmpDir, 'myapp.config.json'),
        JSON.stringify({ ...validConfig, extraField: 'should-be-stripped' })
      )

      const [error, result] = await client.load(tmpDir)

      expect(error).toBeNull()
      expect(result).not.toBeNull()
      expect(result!.config).toStrictEqual(validConfig)
      expect((result!.config as Record<string, unknown>)['extraField']).toBeUndefined()
    })

    it('should load a named layer from factory directories', async () => {
      const projectDir = join(tmpDir, 'project')
      mkdirSync(projectDir, { recursive: true })
      writeFileSync(join(projectDir, 'myapp.config.json'), JSON.stringify(validConfig))
      const client = createConfigClient({
        cwd: projectDir,
        dirs: {
          global: join(tmpDir, 'global'),
          local: join(tmpDir, 'local'),
        },
        name: 'myapp',
        schema,
      })

      const [error, result] = await client.load({ layer: 'project' })

      expect(error).toBeNull()
      expect(result?.config).toStrictEqual(validConfig)
      expect(result?.filePath).toBe(join(projectDir, 'myapp.config.json'))
    })

    it('should derive project and local layers from cwd', async () => {
      const localDir = join(tmpDir, '.myapp')
      mkdirSync(localDir, { recursive: true })
      writeFileSync(join(localDir, 'myapp.config.json'), JSON.stringify(validConfig))
      const client = createConfigClient({ cwd: tmpDir, name: 'myapp', schema })

      const [error, result] = await client.load({ layer: 'local' })

      expect(error).toBeNull()
      expect(result?.config).toStrictEqual(validConfig)
      expect(result?.filePath).toBe(join(localDir, 'myapp.config.json'))
    })
  })

  describe('layered load', () => {
    const layeredSchema = z.object({
      items: z.array(z.string()).optional(),
      name: z.string(),
      nested: z.object({
        globalOnly: z.string().optional(),
        localOnly: z.string().optional(),
        projectOnly: z.string().optional(),
        shared: z.string(),
      }),
    })

    function createLayerDirs(): {
      readonly global: string
      readonly project: string
      readonly local: string
    } {
      const dirs = {
        global: join(tmpDir, 'global'),
        project: join(tmpDir, 'project'),
        local: join(tmpDir, 'local'),
      }
      Object.values(dirs).map((dir) => mkdirSync(dir, { recursive: true }))
      return dirs
    }

    it('should deep merge all layers with local precedence', async () => {
      const dirs = createLayerDirs()
      writeFileSync(
        join(dirs.global, 'myapp.config.json'),
        JSON.stringify({ name: 'global', nested: { globalOnly: 'global', shared: 'global' } })
      )
      writeFileSync(
        join(dirs.project, 'myapp.config.json'),
        JSON.stringify({ name: 'project', nested: { projectOnly: 'project', shared: 'project' } })
      )
      writeFileSync(
        join(dirs.local, 'myapp.config.json'),
        JSON.stringify({ name: 'local', nested: { localOnly: 'local', shared: 'local' } })
      )
      const client = createConfigClient({
        cwd: dirs.project,
        dirs: { global: dirs.global, local: dirs.local },
        name: 'myapp',
        schema: layeredSchema,
      })

      const [error, result] = await client.load({ layers: true })

      expect(error).toBeNull()
      expect(result?.config).toStrictEqual({
        name: 'local',
        nested: {
          globalOnly: 'global',
          localOnly: 'local',
          projectOnly: 'project',
          shared: 'local',
        },
      })
    })

    it('should replace arrays with the higher-precedence layer', async () => {
      const dirs = createLayerDirs()
      writeFileSync(
        join(dirs.global, 'myapp.config.json'),
        JSON.stringify({
          items: ['global-a', 'global-b'],
          name: 'global',
          nested: { shared: 'global' },
        })
      )
      writeFileSync(
        join(dirs.local, 'myapp.config.json'),
        JSON.stringify({ items: ['local'], name: 'local', nested: { shared: 'local' } })
      )
      const client = createConfigClient({
        cwd: dirs.project,
        dirs: { global: dirs.global, local: dirs.local },
        name: 'myapp',
        schema: layeredSchema,
      })

      const [error, result] = await client.load({ layers: true })

      expect(error).toBeNull()
      expect(result?.config.items).toStrictEqual(['local'])
    })

    it('should preserve per-layer provenance and missing layer metadata', async () => {
      const dirs = createLayerDirs()
      const projectConfig = {
        name: 'project',
        nested: { projectOnly: 'project', shared: 'project' },
      }
      writeFileSync(
        join(dirs.project, 'myapp.config.yaml'),
        'name: project\nnested:\n  shared: project\n  projectOnly: project\n'
      )
      const client = createConfigClient({
        cwd: dirs.project,
        dirs: { global: dirs.global, local: dirs.local },
        name: 'myapp',
        schema: layeredSchema,
      })

      const [error, result] = await client.load({ layers: true })

      expect(error).toBeNull()
      expect(result?.layers).toStrictEqual([
        { config: null, filePath: null, format: null, name: 'global' },
        {
          config: projectConfig,
          filePath: join(dirs.project, 'myapp.config.yaml'),
          format: 'yaml',
          name: 'project',
        },
        { config: null, filePath: null, format: null, name: 'local' },
      ])
    })

    it('should apply schema defaults when all layers are missing', async () => {
      const dirs = createLayerDirs()
      const defaultSchema = z.object({ port: z.number().default(3000) })
      const client = createConfigClient({
        cwd: dirs.project,
        dirs: { global: dirs.global, local: dirs.local },
        name: 'myapp',
        schema: defaultSchema,
      })

      const [error, result] = await client.load({ layers: true })

      expect(error).toBeNull()
      expect(result?.config).toStrictEqual({ port: 3000 })
    })

    it('should include the invalid layer file path in validation errors', async () => {
      const dirs = createLayerDirs()
      const localPath = join(dirs.local, 'myapp.config.json')
      writeFileSync(localPath, JSON.stringify({ name: 42, nested: { shared: 'local' } }))
      const client = createConfigClient({
        cwd: dirs.project,
        dirs: { global: dirs.global, local: dirs.local },
        name: 'myapp',
        schema: layeredSchema,
      })

      const [error, result] = await client.load({ layers: true })

      expect(result).toBeNull()
      expect(error?.message).toContain(localPath)
      expect(error?.message).toContain('name')
    })
  })

  describe('write', () => {
    it('should write JSON config with name.config pattern', async () => {
      const client = createConfigClient({ name: 'myapp', schema })

      const [error, result] = await client.write(validConfig, {
        dir: tmpDir,
        format: 'json',
      })

      expect(error).toBeNull()
      expect(result!.filePath).toBe(join(tmpDir, 'myapp.config.json'))
      expect(result!.format).toBe('json')

      const [loadError, loaded] = await client.load(tmpDir)
      expect(loadError).toBeNull()
      expect(loaded!.config).toStrictEqual(validConfig)
    })

    it('should write JSONC config as default format with name.config pattern', async () => {
      const client = createConfigClient({ name: 'myapp', schema })

      const [error, result] = await client.write(validConfig, { dir: tmpDir })

      expect(error).toBeNull()
      expect(result!.filePath).toBe(join(tmpDir, 'myapp.config.jsonc'))
      expect(result!.format).toBe('jsonc')

      const [loadError, loaded] = await client.load(tmpDir)
      expect(loadError).toBeNull()
      expect(loaded!.config).toStrictEqual(validConfig)
    })

    it('should write YAML config with name.config pattern', async () => {
      const client = createConfigClient({ name: 'myapp', schema })

      const [error, result] = await client.write(validConfig, {
        dir: tmpDir,
        format: 'yaml',
      })

      expect(error).toBeNull()
      expect(result!.filePath).toBe(join(tmpDir, 'myapp.config.yaml'))
      expect(result!.format).toBe('yaml')

      const [loadError, loaded] = await client.load(tmpDir)
      expect(loadError).toBeNull()
      expect(loaded!.config).toStrictEqual(validConfig)
    })

    it('should create directories recursively', async () => {
      const client = createConfigClient({ name: 'myapp', schema })
      const deepDir = join(tmpDir, 'a', 'b', 'c')

      const [error, result] = await client.write(validConfig, {
        dir: deepDir,
        format: 'json',
      })

      expect(error).toBeNull()
      expect(result!.filePath).toBe(join(deepDir, 'myapp.config.json'))
    })

    it('should return Error for invalid data', async () => {
      const client = createConfigClient({ name: 'myapp', schema })

      const [error, result] = await client.write(
        { name: 123, version: 'bad' } as unknown as TestConfig,
        { dir: tmpDir }
      )

      expect(result).toBeNull()
      expect(error).toBeInstanceOf(Error)
      expect(error!.message).toContain('Invalid config data')
    })

    it('should use filePath when provided', async () => {
      const client = createConfigClient({ name: 'myapp', schema })
      const customPath = join(tmpDir, 'custom', 'config.json')

      const [error, result] = await client.write(validConfig, {
        filePath: customPath,
      })

      expect(error).toBeNull()
      expect(result!.filePath).toBe(customPath)
    })

    it('should infer format from filePath extension', async () => {
      const client = createConfigClient({ name: 'myapp', schema })

      const yamlPath = join(tmpDir, 'config.yaml')
      const [yamlError, yamlResult] = await client.write(validConfig, { filePath: yamlPath })
      expect(yamlError).toBeNull()
      expect(yamlResult!.format).toBe('yaml')

      const jsoncPath = join(tmpDir, 'config.jsonc')
      const [jsoncError, jsoncResult] = await client.write(validConfig, { filePath: jsoncPath })
      expect(jsoncError).toBeNull()
      expect(jsoncResult!.format).toBe('jsonc')

      const jsonPath = join(tmpDir, 'config.json')
      const [jsonError, jsonResult] = await client.write(validConfig, { filePath: jsonPath })
      expect(jsonError).toBeNull()
      expect(jsonResult!.format).toBe('json')
    })

    it('should prefer explicit format over filePath extension', async () => {
      const client = createConfigClient({ name: 'myapp', schema })

      const [error, result] = await client.write(validConfig, {
        filePath: join(tmpDir, 'config.yaml'),
        format: 'json',
      })

      expect(error).toBeNull()
      expect(result!.format).toBe('json')
    })

    it('should reject TS/JS filePath extensions', async () => {
      const client = createConfigClient({ name: 'myapp', schema })

      const [error, result] = await client.write(validConfig, {
        filePath: join(tmpDir, 'config.ts'),
      })

      expect(result).toBeNull()
      expect(error).toBeInstanceOf(Error)
      expect(error!.message).toContain('not writable')
    })

    it.skipIf(process.platform === 'win32')(
      'should return Error when write target directory is unwritable',
      async () => {
        const client = createConfigClient({ name: 'myapp', schema })
        const readonlyDir = join(tmpDir, 'readonly')
        mkdirSync(readonlyDir)
        chmodSync(readonlyDir, 0o444)

        const [error, result] = await client.write(validConfig, {
          filePath: join(readonlyDir, 'sub', 'config.json'),
        })

        chmodSync(readonlyDir, 0o755)
        expect(result).toBeNull()
        expect(error).toBeInstanceOf(Error)
        expect(error!.message).toContain('Failed to create directory')
      }
    )

    it('should round-trip: write then load produces same data', async () => {
      const client = createConfigClient({ name: 'myapp', schema })
      const data: TestConfig = {
        features: ['feature-a', 'feature-b', 'feature-c'],
        name: 'round-trip-app',
        version: 42,
      }

      const formats = ['json', 'jsonc', 'yaml'] as const
      await Promise.all(
        formats.map(async (format) => {
          const subDir = join(tmpDir, `rt-${format}`)
          mkdirSync(subDir, { recursive: true })
          mkdirSync(join(subDir, '.git'), { recursive: true })

          const [writeError] = await client.write(data, { dir: subDir, format })
          expect(writeError).toBeNull()

          const [loadError, loaded] = await client.load(subDir)
          expect(loadError).toBeNull()
          expect(loaded!.config).toStrictEqual(data)
          expect(loaded!.format).toBe(format)
        })
      )
    })
  })
})
