import { describe, expect, it, vi } from 'vitest'

import { NODE_BUILTINS, SHEBANG } from '../constants.js'
import { toTsdownBuildConfig, toTsdownWatchConfig } from './config.js'
import type { ResolvedBundlerConfig } from '../types.js'

const config: ResolvedBundlerConfig = {
  build: {
    clean: true,
    define: {},
    external: ['pg'],
    minify: false,
    sourcemap: true,
    target: 'node18',
  },
  buildOutDir: '/project/dist',
  commands: '/project/commands',
  compile: {
    name: 'my-cli',
    targets: [],
  },
  compileOutDir: '/project/dist',
  cwd: '/project',
  entry: '/project/src/index.ts',
  include: [],
  version: undefined,
}

describe('build config mapping', () => {
  const result = toTsdownBuildConfig({ config })

  it('should set entry as object with index key', () => {
    expect(result.entry).toStrictEqual({ index: '/project/src/index.ts' })
  })

  it('should set format to esm', () => {
    expect(result.format).toBe('esm')
  })

  it('should set platform to node', () => {
    expect(result.platform).toBe('node')
  })

  it('should set outDir from resolved config', () => {
    expect(result.outDir).toBe('/project/dist')
  })

  it('should set target from resolved config', () => {
    expect(result.target).toBe('node18')
  })

  it('should set sourcemap from resolved config', () => {
    expect(result.sourcemap).toBeTruthy()
  })

  it('should set minify from resolved config', () => {
    expect(result.minify).toBeFalsy()
  })

  it('should prepend shebang as banner', () => {
    expect(result.banner).toBe(SHEBANG)
  })

  it('should disable config file loading', () => {
    expect(result.config).toBeFalsy()
  })

  it('should disable tsdown clean (maltty handles cleaning) and enable treeshake', () => {
    expect(result.clean).toBeFalsy()
    expect(result.treeshake).toBeTruthy()
  })

  it('should disable dts', () => {
    expect(result.dts).toBeFalsy()
  })

  it('should set logLevel to silent', () => {
    expect(result.logLevel).toBe('silent')
  })

  it('should disable code splitting for single-file output', () => {
    const outputOpts = result.outputOptions as { codeSplitting: boolean }
    expect(outputOpts.codeSplitting).toBeFalsy()
  })

  it('should prefer ESM module entry via mainFields', () => {
    const inputOpts = result.inputOptions as { resolve: { mainFields: string[] } }
    expect(inputOpts.resolve.mainFields).toStrictEqual(['module', 'main'])
  })

  it('should set cwd from resolved config', () => {
    expect(result.cwd).toBe('/project')
  })

  it('should combine node builtins and user externals in deps.neverBundle', () => {
    const neverBundle = result.deps as { neverBundle: (string | RegExp)[] }
    expect(neverBundle.neverBundle).toContain('pg')
    expect(neverBundle.neverBundle).toEqual(expect.arrayContaining(NODE_BUILTINS))
  })

  it('should not include __MALTTY_VERSION__ when version is undefined', () => {
    const output = toTsdownBuildConfig({ config })
    expect(output.define).not.toHaveProperty('__MALTTY_VERSION__')
  })

  it('should set __MALTTY_VERSION__ define when version is provided', () => {
    const configWithVersion = { ...config, version: '3.2.1' }
    const output = toTsdownBuildConfig({ config: configWithVersion })
    expect(output.define).toMatchObject({ __MALTTY_VERSION__: '"3.2.1"' })
  })

  it('should merge user define into the define map', () => {
    const configWithDefine = {
      ...config,
      build: { ...config.build, define: { __MY_KEY__: '"abc"' } },
    }
    const output = toTsdownBuildConfig({ config: configWithDefine })
    expect(output.define).toMatchObject({ __MY_KEY__: '"abc"' })
  })

  it('should resolve MALTTY_PUBLIC_* env vars into define map', () => {
    process.env.MALTTY_PUBLIC_TEST_KEY = 'test-value'

    const output = toTsdownBuildConfig({ config })
    expect(output.define).toMatchObject({
      'process.env.MALTTY_PUBLIC_TEST_KEY': '"test-value"',
    })

    delete process.env.MALTTY_PUBLIC_TEST_KEY
  })

  it('should let user define override MALTTY_PUBLIC_* env vars', () => {
    process.env.MALTTY_PUBLIC_TEST_KEY = 'env-value'

    const configWithDefine = {
      ...config,
      build: {
        ...config.build,
        define: { 'process.env.MALTTY_PUBLIC_TEST_KEY': '"override"' },
      },
    }
    const output = toTsdownBuildConfig({ config: configWithDefine })
    expect(output.define).toMatchObject({
      'process.env.MALTTY_PUBLIC_TEST_KEY': '"override"',
    })

    delete process.env.MALTTY_PUBLIC_TEST_KEY
  })

  it('should bundle all deps and add stub plugin when compile is true', () => {
    const output = toTsdownBuildConfig({ config, compile: true })
    const deps = output.deps as { alwaysBundle: RegExp[] }
    expect(deps.alwaysBundle).toStrictEqual([/./])
    const plugins = output.plugins as { name: string }[]
    const pluginNames = plugins.map((p) => p.name)
    expect(pluginNames).toContain('maltty-stub-packages')
  })
})

describe('watch config mapping', () => {
  it('should spread build config and enable watch', () => {
    const result = toTsdownWatchConfig({ config })
    expect(result.watch).toBeTruthy()
    expect(result.format).toBe('esm')
  })

  it('should override logLevel to error for watch mode', () => {
    const result = toTsdownWatchConfig({ config })
    expect(result.logLevel).toBe('error')
  })

  it('should pass through onSuccess callback', () => {
    const onSuccess = vi.fn()
    const result = toTsdownWatchConfig({ config, onSuccess })
    expect(result.onSuccess).toBe(onSuccess)
  })

  it('should leave onSuccess undefined when not provided', () => {
    const result = toTsdownWatchConfig({ config })
    expect(result.onSuccess).toBeUndefined()
  })

  it('should pass version define through to build config', () => {
    const configWithVersion = { ...config, version: '1.0.0' }
    const result = toTsdownWatchConfig({ config: configWithVersion })
    expect(result.define).toMatchObject({ __MALTTY_VERSION__: '"1.0.0"' })
  })
})
