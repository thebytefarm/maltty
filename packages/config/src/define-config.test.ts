import { TAG } from '@maltty/utils/tag'
import { describe, expect, it } from 'vitest'

import { defineConfig } from './define-config.js'

describe(defineConfig, () => {
  it('should return a tagged copy of the config', () => {
    const config = defineConfig({ entry: './src/index.ts' })

    expect(config.entry).toBe('./src/index.ts')
    expect(config[TAG]).toBe('MalttyConfig')
  })

  it('should tag an empty config', () => {
    const config = defineConfig({})

    expect(config[TAG]).toBe('MalttyConfig')
  })

  it('should preserve all config fields', () => {
    const config = defineConfig({
      build: { minify: true, out: './build', target: 'node20' },
      commands: './cmds',
      compile: { name: 'my-cli', out: './bin', targets: ['linux-x64'] },
      entry: './main.ts',
      include: ['assets/**'],
    })

    expect(config.entry).toBe('./main.ts')
    expect(config.commands).toBe('./cmds')
    expect(config.build).toEqual({ minify: true, out: './build', target: 'node20' })
    expect(config.compile).toEqual({ name: 'my-cli', out: './bin', targets: ['linux-x64'] })
    expect(config.include).toEqual(['assets/**'])
  })

  it('should not mutate the original object', () => {
    const original = { entry: './src/index.ts' }
    defineConfig(original)

    expect(TAG in original).toBeFalsy()
  })
})
