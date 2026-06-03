import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { clean } from './clean.js'

const testDir = join(tmpdir(), `maltty-clean-test-${Date.now()}`)

function makeResolved(
  overrides: {
    readonly buildOutDir?: string
    readonly compileName?: string
    readonly compileTargets?: readonly string[]
  } = {}
): Parameters<typeof clean>[0]['resolved'] {
  return {
    entry: '/project/src/index.ts',
    commands: '/project/commands',
    buildOutDir: overrides.buildOutDir ?? testDir,
    compileOutDir: testDir,
    build: {
      target: 'node18',
      minify: false,
      sourcemap: true,
      external: [],
      clean: true,
      define: {},
    },
    compile: {
      name: overrides.compileName ?? 'cli',
      targets: (overrides.compileTargets ?? []) as never,
    },
    include: [],
    cwd: '/project',
    version: '1.0.0',
  }
}

describe(clean, () => {
  beforeEach(() => {
    mkdirSync(testDir, { recursive: true })
  })

  afterEach(() => {
    rmSync(testDir, { force: true, recursive: true })
  })

  it('should return empty result for non-existent directory', async () => {
    const result = await clean({
      resolved: makeResolved({ buildOutDir: '/non/existent/path' }),
      compile: false,
    })

    expect(result.removed).toStrictEqual([])
    expect(result.foreign).toStrictEqual([])
  })

  it('should remove build artifacts', async () => {
    writeFileSync(join(testDir, 'index.js'), '')
    writeFileSync(join(testDir, 'index.js.map'), '')

    const result = await clean({ resolved: makeResolved(), compile: false })

    expect(result.removed).toContain('index.js')
    expect(result.removed).toContain('index.js.map')
    expect(existsSync(join(testDir, 'index.js'))).toBeFalsy()
    expect(existsSync(join(testDir, 'index.js.map'))).toBeFalsy()
  })

  it('should preserve foreign files and report them', async () => {
    writeFileSync(join(testDir, 'index.js'), '')
    writeFileSync(join(testDir, 'README.md'), '')

    const result = await clean({ resolved: makeResolved(), compile: false })

    expect(result.removed).toContain('index.js')
    expect(result.foreign).toContain('README.md')
    expect(existsSync(join(testDir, 'README.md'))).toBeTruthy()
  })

  it('should not remove extensionless files when compile is false', async () => {
    writeFileSync(join(testDir, 'cli-darwin-arm64'), '')

    const result = await clean({ resolved: makeResolved(), compile: false })

    expect(result.foreign).toContain('cli-darwin-arm64')
    expect(existsSync(join(testDir, 'cli-darwin-arm64'))).toBeTruthy()
  })

  it('should remove exact binary names when compile is true', async () => {
    writeFileSync(join(testDir, 'index.mjs'), '')
    writeFileSync(join(testDir, 'my-app-darwin-arm64'), '')
    writeFileSync(join(testDir, 'my-app-linux-x64'), '')
    writeFileSync(join(testDir, 'README.md'), '')

    const result = await clean({
      resolved: makeResolved({
        compileName: 'my-app',
        compileTargets: ['darwin-arm64', 'linux-x64'],
      }),
      compile: true,
    })

    expect(result.removed).toContain('index.mjs')
    expect(result.removed).toContain('my-app-darwin-arm64')
    expect(result.removed).toContain('my-app-linux-x64')
    expect(result.foreign).toContain('README.md')
    expect(existsSync(join(testDir, 'my-app-darwin-arm64'))).toBeFalsy()
    expect(existsSync(join(testDir, 'my-app-linux-x64'))).toBeFalsy()
    expect(existsSync(join(testDir, 'README.md'))).toBeTruthy()
  })

  it('should remove windows .exe binary names in multi-target builds', async () => {
    writeFileSync(join(testDir, 'cli-windows-x64.exe'), '')
    writeFileSync(join(testDir, 'cli-darwin-arm64'), '')

    const result = await clean({
      resolved: makeResolved({
        compileName: 'cli',
        compileTargets: ['windows-x64', 'darwin-arm64'],
      }),
      compile: true,
    })

    expect(result.removed).toContain('cli-windows-x64.exe')
    expect(result.removed).toContain('cli-darwin-arm64')
  })

  it('should not suffix single-target binary names', async () => {
    writeFileSync(join(testDir, 'my-app'), '')

    const result = await clean({
      resolved: makeResolved({
        compileName: 'my-app',
        compileTargets: ['darwin-arm64'],
      }),
      compile: true,
    })

    expect(result.removed).toContain('my-app')
  })

  it('should return empty result for empty directory', async () => {
    const result = await clean({ resolved: makeResolved(), compile: false })

    expect(result.removed).toStrictEqual([])
    expect(result.foreign).toStrictEqual([])
  })
})
