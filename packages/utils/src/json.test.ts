import { describe, expect, it } from 'vitest'

import { jsonParse, jsonStringify } from './json.js'

describe(jsonParse, () => {
  it('should parse a valid JSON object string', () => {
    const [error, value] = jsonParse('{"name":"maltty","version":1}')

    expect(error).toBeNull()
    expect(value).toEqual({ name: 'maltty', version: 1 })
  })

  it('should parse a valid JSON array string', () => {
    const [error, value] = jsonParse('[1,2,3]')

    expect(error).toBeNull()
    expect(value).toEqual([1, 2, 3])
  })

  it('should return error for invalid JSON', () => {
    const [error, value] = jsonParse('{not json}')

    expect(error).toBeInstanceOf(Error)
    expect(value).toBeNull()
  })

  it('should include a descriptive message in the failure result', () => {
    const [error] = jsonParse('<<<')

    expect(error).toBeInstanceOf(Error)
    expect(error.message).toMatch(/Failed to parse JSON/)
  })
})

describe(jsonStringify, () => {
  it('should stringify a value to compact JSON', () => {
    const [error, value] = jsonStringify({ a: 1, b: 'two' })

    expect(error).toBeNull()
    expect(value).toBe('{"a":1,"b":"two"}')
  })

  it('should stringify with 2-space indentation when pretty is true', () => {
    const [error, value] = jsonStringify({ a: 1 }, { pretty: true })

    expect(error).toBeNull()
    expect(value).toBe('{\n  "a": 1\n}')
  })

  it('should return error for circular references', () => {
    const circular: Record<string, unknown> = { name: 'loop' }
    circular.self = circular

    const [error, value] = jsonStringify(circular)

    expect(error).toBeInstanceOf(Error)
    expect(error.message).toMatch(/Failed to stringify JSON/)
    expect(value).toBeNull()
  })
})
