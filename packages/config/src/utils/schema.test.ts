import { describe, expect, it } from 'vitest'

import {
  KiddConfigSchema,
  SidecarChecksumsSchema,
  SidecarPlatformMappingSchema,
  SidecarSchema,
  SidecarSourceSchema,
  validateConfig,
} from './schema.js'

describe('KiddConfigSchema schema', () => {
  it('should accept an empty object', () => {
    const result = KiddConfigSchema.safeParse({})

    expect(result.success).toBeTruthy()
  })

  it('should accept a fully populated config', () => {
    const result = KiddConfigSchema.safeParse({
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
    const result = KiddConfigSchema.safeParse({ outDir: './dist' })

    expect(result.success).toBeFalsy()
  })

  it('should reject unknown top-level keys', () => {
    const result = KiddConfigSchema.safeParse({ unknown: true })

    expect(result.success).toBeFalsy()
  })

  it('should reject unknown build option keys', () => {
    const result = KiddConfigSchema.safeParse({
      build: { unknown: true },
    })

    expect(result.success).toBeFalsy()
  })

  it('should reject invalid compile targets', () => {
    const result = KiddConfigSchema.safeParse({
      compile: { targets: ['invalid-target'] },
    })

    expect(result.success).toBeFalsy()
  })

  it('should accept compile: true (boolean shorthand)', () => {
    const result = KiddConfigSchema.safeParse({ compile: true })

    expect(result.success).toBeTruthy()
  })

  it('should accept compile: false (boolean shorthand)', () => {
    const result = KiddConfigSchema.safeParse({ compile: false })

    expect(result.success).toBeTruthy()
  })

  it('should accept a full KiddConfig with sidecars populated', () => {
    const result = KiddConfigSchema.safeParse({
      entry: './src/index.ts',
      sidecars: [
        {
          name: 'rg',
          platforms: {
            'darwin-arm64': 'aarch64-apple-darwin',
            'linux-x64': 'x86_64-unknown-linux-gnu',
          },
          source: {
            asset: 'rg-{version}-{triple}.tar.gz',
            kind: 'github',
            repo: 'BurntSushi/ripgrep',
          },
          version: '14.1.1',
        },
      ],
    })

    expect(result.success).toBeTruthy()
  })

  it('should accept a KiddConfig without sidecars', () => {
    const result = KiddConfigSchema.safeParse({ entry: './src/index.ts' })

    expect(result.success).toBeTruthy()
  })
})

describe('SidecarSourceSchema schema', () => {
  it('should accept a github source', () => {
    const result = SidecarSourceSchema.safeParse({
      asset: 'ripgrep-{version}-{triple}.tar.gz',
      kind: 'github',
      repo: 'BurntSushi/ripgrep',
    })

    expect(result.success).toBeTruthy()
  })

  it('should reject an unknown source kind', () => {
    const result = SidecarSourceSchema.safeParse({
      asset: 'foo.tar.gz',
      kind: 'http',
      repo: 'example/repo',
    })

    expect(result.success).toBeFalsy()
  })

  it('should reject a source missing repo', () => {
    const result = SidecarSourceSchema.safeParse({
      asset: 'foo.tar.gz',
      kind: 'github',
    })

    expect(result.success).toBeFalsy()
  })

  it('should reject a source missing asset', () => {
    const result = SidecarSourceSchema.safeParse({
      kind: 'github',
      repo: 'example/repo',
    })

    expect(result.success).toBeFalsy()
  })

  it('should reject unknown keys in the source', () => {
    const result = SidecarSourceSchema.safeParse({
      asset: 'foo.tar.gz',
      kind: 'github',
      repo: 'example/repo',
      unknown: true,
    })

    expect(result.success).toBeFalsy()
  })
})

describe('SidecarPlatformMappingSchema schema', () => {
  it('should accept a plain string mapping', () => {
    const result = SidecarPlatformMappingSchema.safeParse('aarch64-apple-darwin')

    expect(result.success).toBeTruthy()
  })

  it('should accept an object mapping with triple only', () => {
    const result = SidecarPlatformMappingSchema.safeParse({ triple: 'aarch64-apple-darwin' })

    expect(result.success).toBeTruthy()
  })

  it('should accept an object mapping with triple and asset override', () => {
    const result = SidecarPlatformMappingSchema.safeParse({
      asset: 'tool-{version}-windows.zip',
      triple: 'x86_64-pc-windows-msvc',
    })

    expect(result.success).toBeTruthy()
  })

  it('should reject an object mapping missing triple', () => {
    const result = SidecarPlatformMappingSchema.safeParse({ asset: 'tool.zip' })

    expect(result.success).toBeFalsy()
  })

  it('should reject an object mapping with unknown keys', () => {
    const result = SidecarPlatformMappingSchema.safeParse({
      extra: 'nope',
      triple: 'aarch64-apple-darwin',
    })

    expect(result.success).toBeFalsy()
  })

  it('should reject a non-string non-object mapping', () => {
    const result = SidecarPlatformMappingSchema.safeParse(42)

    expect(result.success).toBeFalsy()
  })
})

describe('SidecarChecksumsSchema schema', () => {
  it('should accept a sha256 checksum bag', () => {
    const result = SidecarChecksumsSchema.safeParse({
      algorithm: 'sha256',
      values: { 'aarch64-apple-darwin': 'abc123' },
    })

    expect(result.success).toBeTruthy()
  })

  it('should accept a sha512 checksum bag', () => {
    const result = SidecarChecksumsSchema.safeParse({
      algorithm: 'sha512',
      values: {},
    })

    expect(result.success).toBeTruthy()
  })

  it('should reject an unknown algorithm', () => {
    const result = SidecarChecksumsSchema.safeParse({
      algorithm: 'md5',
      values: {},
    })

    expect(result.success).toBeFalsy()
  })

  it('should reject missing values', () => {
    const result = SidecarChecksumsSchema.safeParse({ algorithm: 'sha256' })

    expect(result.success).toBeFalsy()
  })
})

describe('SidecarSchema schema', () => {
  const baseSidecar = {
    name: 'rg',
    platforms: {
      'darwin-arm64': 'aarch64-apple-darwin',
    },
    source: {
      asset: 'rg-{version}-{triple}.tar.gz',
      kind: 'github',
      repo: 'BurntSushi/ripgrep',
    },
    version: '14.1.1',
  }

  it('should accept a valid sidecar config', () => {
    const result = SidecarSchema.safeParse(baseSidecar)

    expect(result.success).toBeTruthy()
  })

  it('should accept per-platform string mappings', () => {
    const result = SidecarSchema.safeParse({
      ...baseSidecar,
      platforms: {
        'darwin-arm64': 'aarch64-apple-darwin',
        'linux-x64': 'x86_64-unknown-linux-gnu',
        'windows-x64': 'x86_64-pc-windows-msvc',
      },
    })

    expect(result.success).toBeTruthy()
  })

  it('should accept per-platform object mappings with triple and asset override', () => {
    const result = SidecarSchema.safeParse({
      ...baseSidecar,
      platforms: {
        'darwin-arm64': { triple: 'aarch64-apple-darwin' },
        'windows-x64': {
          asset: 'rg-{version}-windows.zip',
          triple: 'x86_64-pc-windows-msvc',
        },
      },
    })

    expect(result.success).toBeTruthy()
  })

  it('should accept a mix of string and object platform mappings', () => {
    const result = SidecarSchema.safeParse({
      ...baseSidecar,
      platforms: {
        'darwin-arm64': 'aarch64-apple-darwin',
        'windows-x64': {
          asset: 'rg-{version}-windows.zip',
          triple: 'x86_64-pc-windows-msvc',
        },
      },
    })

    expect(result.success).toBeTruthy()
  })

  it('should accept optional lazy flag', () => {
    const result = SidecarSchema.safeParse({ ...baseSidecar, lazy: true })

    expect(result.success).toBeTruthy()
  })

  it('should accept optional checksums', () => {
    const result = SidecarSchema.safeParse({
      ...baseSidecar,
      checksums: {
        algorithm: 'sha256',
        values: { 'aarch64-apple-darwin': 'abc123' },
      },
    })

    expect(result.success).toBeTruthy()
  })

  it('should reject a sidecar missing name', () => {
    const result = SidecarSchema.safeParse({
      platforms: baseSidecar.platforms,
      source: baseSidecar.source,
      version: baseSidecar.version,
    })

    expect(result.success).toBeFalsy()
  })

  it('should reject a sidecar missing version', () => {
    const result = SidecarSchema.safeParse({
      name: baseSidecar.name,
      platforms: baseSidecar.platforms,
      source: baseSidecar.source,
    })

    expect(result.success).toBeFalsy()
  })

  it('should reject a sidecar missing source', () => {
    const result = SidecarSchema.safeParse({
      name: baseSidecar.name,
      platforms: baseSidecar.platforms,
      version: baseSidecar.version,
    })

    expect(result.success).toBeFalsy()
  })

  it('should reject a sidecar with an invalid platform key', () => {
    const result = SidecarSchema.safeParse({
      ...baseSidecar,
      platforms: { 'darwin-amd64': 'aarch64-apple-darwin' },
    })

    expect(result.success).toBeFalsy()
  })

  it('should reject a sidecar with an invalid source.kind', () => {
    const result = SidecarSchema.safeParse({
      ...baseSidecar,
      source: {
        asset: 'foo.tar.gz',
        kind: 'http',
        repo: 'example/repo',
      },
    })

    expect(result.success).toBeFalsy()
  })

  it('should reject a sidecar with unknown top-level keys', () => {
    const result = SidecarSchema.safeParse({ ...baseSidecar, extra: true })

    expect(result.success).toBeFalsy()
  })
})

describe(validateConfig, () => {
  it('should return success for valid config', () => {
    const [error, config] = validateConfig({ entry: './src/index.ts' })

    expect(error).toBeNull()
    expect(config).toEqual({ entry: './src/index.ts' })
  })

  it('should return success for empty config', () => {
    const [error, config] = validateConfig({})

    expect(error).toBeNull()
    expect(config).toEqual({})
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
      expect(error.message).toContain('Invalid kidd config')
    }
  })

  it('should return error for unknown keys', () => {
    const [error, config] = validateConfig({ extra: 'nope' })

    expect(error).toBeInstanceOf(Error)
    expect(config).toBeNull()
  })
})
