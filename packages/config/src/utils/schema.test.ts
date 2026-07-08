import { describe, expect, it } from 'vitest'

import { MalttyConfigSchema, validateConfig } from './schema.js'

describe('malttyConfigSchema schema', () => {
  it('should accept an empty object', () => {
    const result = MalttyConfigSchema.safeParse({})

    expect(result.success).toBeTruthy()
  })

  it('should accept a fully populated config', () => {
    const result = MalttyConfigSchema.safeParse({
      build: { external: ['pg'], minify: true, out: './dist', sourcemap: false, target: 'node20' },
      commands: './commands',
      compile: {
        autoloadDotenv: true,
        name: 'my-cli',
        out: './bin',
        targets: ['linux-x64', 'darwin-arm64'],
      },
      entry: './src/index.ts',
      include: ['assets/**'],
    })

    expect(result.success).toBeTruthy()
  })

  it('should reject root-level outDir', () => {
    const result = MalttyConfigSchema.safeParse({ outDir: './dist' })

    expect(result.success).toBeFalsy()
  })

  it('should reject unknown top-level keys', () => {
    const result = MalttyConfigSchema.safeParse({ unknown: true })

    expect(result.success).toBeFalsy()
  })

  it('should reject unknown build option keys', () => {
    const result = MalttyConfigSchema.safeParse({
      build: { unknown: true },
    })

    expect(result.success).toBeFalsy()
  })

  it('should reject invalid compile targets', () => {
    const result = MalttyConfigSchema.safeParse({
      compile: { targets: ['invalid-target'] },
    })

    expect(result.success).toBeFalsy()
  })

  it('should accept compile: true (boolean shorthand)', () => {
    const result = MalttyConfigSchema.safeParse({ compile: true })

    expect(result.success).toBeTruthy()
  })

  it('should accept compile: false (boolean shorthand)', () => {
    const result = MalttyConfigSchema.safeParse({ compile: false })

    expect(result.success).toBeTruthy()
  })
})

describe(validateConfig, () => {
  it('should return success for valid config', () => {
    const [error, config] = validateConfig({ entry: './src/index.ts' })

    expect(error).toBeNull()
    expect(config).toStrictEqual({ entry: './src/index.ts' })
  })

  it('should return success for empty config', () => {
    const [error, config] = validateConfig({})

    expect(error).toBeNull()
    expect(config).toStrictEqual({})
  })

  it('should return error for invalid config', () => {
    const [error, config] = validateConfig({ entry: 123 })

    expect(error).toBeInstanceOf(Error)
    expect(config).toBeNull()
  })

  it('should include formatted issues in the error message', () => {
    const [error] = validateConfig({ entry: 123 })

    expect(error).toBeInstanceOf(Error)
    if (error) {
      expect(error.message).toContain('Invalid maltty config')
    }
  })

  it('should return error for unknown keys', () => {
    const [error, config] = validateConfig({ extra: 'nope' })

    expect(error).toBeInstanceOf(Error)
    expect(config).toBeNull()
  })
})
