import { describe, expect, it } from 'vitest'

import { getExtension, getFormat, serializeContent } from './serialize.js'

describe('getFormat()', () => {
  it('should return json for .json extension', () => {
    expect(getFormat('config.json')).toBe('json')
  })

  it('should return jsonc for .jsonc extension', () => {
    expect(getFormat('config.jsonc')).toBe('jsonc')
  })

  it('should return json5 for .json5 extension', () => {
    expect(getFormat('config.json5')).toBe('json5')
  })

  it('should return yaml for .yaml extension', () => {
    expect(getFormat('config.yaml')).toBe('yaml')
  })

  it('should return yaml for .yml extension', () => {
    expect(getFormat('config.yml')).toBe('yaml')
  })

  it('should return toml for .toml extension', () => {
    expect(getFormat('config.toml')).toBe('toml')
  })

  it('should return ts for .ts extension', () => {
    expect(getFormat('config.ts')).toBe('ts')
  })

  it('should return ts for .mts extension', () => {
    expect(getFormat('config.mts')).toBe('ts')
  })

  it('should return ts for .cts extension', () => {
    expect(getFormat('config.cts')).toBe('ts')
  })

  it('should return js for .js extension', () => {
    expect(getFormat('config.js')).toBe('js')
  })

  it('should return js for .mjs extension', () => {
    expect(getFormat('config.mjs')).toBe('js')
  })

  it('should return js for .cjs extension', () => {
    expect(getFormat('config.cjs')).toBe('js')
  })

  it('should return json for unknown extension', () => {
    expect(getFormat('config.xml')).toBe('json')
  })

  it('should return json when there is no extension', () => {
    expect(getFormat('config')).toBe('json')
  })
})

describe('serializeContent()', () => {
  it('should return ok result with pretty-printed JSON for json format', () => {
    const [error, result] = serializeContent({ name: 'test' }, 'json')

    expect(error).toBeNull()
    expect(result).toBe('{\n  "name": "test"\n}\n')
  })

  it('should return ok result with pretty-printed JSON for jsonc format', () => {
    const [error, result] = serializeContent({ name: 'test' }, 'jsonc')

    expect(error).toBeNull()
    expect(result).toBe('{\n  "name": "test"\n}\n')
  })

  it('should return ok result with YAML string for yaml format', () => {
    const [error, result] = serializeContent({ name: 'test' }, 'yaml')

    expect(error).toBeNull()
    expect(typeof result).toBe('string')
    expect(result).toContain('name: test')
  })

  it('should return err result for circular reference', () => {
    const circular: Record<string, unknown> = { a: 1 }
    circular['self'] = circular

    const [error, result] = serializeContent(circular, 'json')

    expect(error).toBeInstanceOf(Error)
    expect(result).toBeNull()
  })
})

describe('getExtension()', () => {
  it('should return .json for json format', () => {
    expect(getExtension('json')).toBe('.json')
  })

  it('should return .jsonc for jsonc format', () => {
    expect(getExtension('jsonc')).toBe('.jsonc')
  })

  it('should return .yaml for yaml format', () => {
    expect(getExtension('yaml')).toBe('.yaml')
  })
})
