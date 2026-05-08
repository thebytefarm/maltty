import { describe, expect, it } from 'vitest'

import { toImportUrl, toPosixPath } from './path.js'

describe('toImportUrl()', () => {
  it('should convert a posix path to a file:// URL', () => {
    expect(toImportUrl('/project/commands/status.ts')).toBe('file:///project/commands/status.ts')
  })

  it('should preserve nested path segments', () => {
    expect(toImportUrl('/a/b/c/d.ts')).toBe('file:///a/b/c/d.ts')
  })

  it('should encode special characters per RFC 3986', () => {
    expect(toImportUrl('/project/with space/file.ts')).toBe('file:///project/with%20space/file.ts')
  })
})

describe('toPosixPath()', () => {
  it('should replace backslash separators with forward slashes', () => {
    expect(toPosixPath(String.raw`src\commands\status.ts`)).toBe('src/commands/status.ts')
  })

  it('should leave a posix path unchanged', () => {
    expect(toPosixPath('src/commands/status.ts')).toBe('src/commands/status.ts')
  })

  it('should handle a windows-style absolute path', () => {
    expect(toPosixPath(String.raw`C:\Users\foo\bar.ts`)).toBe('C:/Users/foo/bar.ts')
  })

  it('should handle empty input', () => {
    expect(toPosixPath('')).toBe('')
  })

  it('should replace every backslash, not just the first', () => {
    expect(toPosixPath(String.raw`a\b\c\d`)).toBe('a/b/c/d')
  })
})
