import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { z } from 'zod'

import { createDotDirectoryClient } from './create-dot-directory-client.js'
import { createProtectionRegistry } from './protection.js'

describe('createDotDirectoryClient()', () => {
  let tmpDir: string
  let registry: ReturnType<typeof createProtectionRegistry>

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'maltty-dotdir-'))
    registry = createProtectionRegistry()
  })

  afterEach(() => {
    rmSync(tmpDir, { force: true, recursive: true })
  })

  // -------------------------------------------------------------------------
  // Dir
  // -------------------------------------------------------------------------

  describe('dir', () => {
    it('should expose the resolved directory path', () => {
      const dotdir = createDotDirectoryClient({ dir: tmpDir, location: 'global', registry })

      expect(dotdir.dir).toBe(tmpDir)
    })
  })

  // -------------------------------------------------------------------------
  // Ensure
  // -------------------------------------------------------------------------

  describe('ensure', () => {
    it('should create the directory if it does not exist', () => {
      const dir = join(tmpDir, 'nested', 'dir')
      const dotdir = createDotDirectoryClient({ dir, location: 'global', registry })

      const [error, result] = dotdir.ensure()

      expect(error).toBeNull()
      expect(result).toBe(dir)
      expect(existsSync(dir)).toBeTruthy()
    })

    it('should succeed when the directory already exists', () => {
      const dotdir = createDotDirectoryClient({ dir: tmpDir, location: 'global', registry })

      const [error, result] = dotdir.ensure()

      expect(error).toBeNull()
      expect(result).toBe(tmpDir)
    })
  })

  // -------------------------------------------------------------------------
  // Write / Read
  // -------------------------------------------------------------------------

  describe('write', () => {
    it('should write a file and return the file path', () => {
      const dotdir = createDotDirectoryClient({ dir: tmpDir, location: 'global', registry })

      const [error, filePath] = dotdir.write('config.json', '{"key":"value"}')

      expect(error).toBeNull()
      expect(filePath).toBe(join(tmpDir, 'config.json'))
      expect(readFileSync(filePath as string, 'utf8')).toBe('{"key":"value"}')
    })

    it('should create parent directory if it does not exist', () => {
      const dir = join(tmpDir, 'new-dir')
      const dotdir = createDotDirectoryClient({ dir, location: 'global', registry })

      const [error] = dotdir.write('file.txt', 'content')

      expect(error).toBeNull()
      expect(existsSync(join(dir, 'file.txt'))).toBeTruthy()
    })
  })

  describe('read', () => {
    it('should read a file and return its content', () => {
      writeFileSync(join(tmpDir, 'data.txt'), 'hello')
      const dotdir = createDotDirectoryClient({ dir: tmpDir, location: 'global', registry })

      const [error, content] = dotdir.read('data.txt')

      expect(error).toBeNull()
      expect(content).toBe('hello')
    })

    it('should return fs_error when the file does not exist', () => {
      const dotdir = createDotDirectoryClient({ dir: tmpDir, location: 'global', registry })

      const [error] = dotdir.read('missing.txt')

      expect(error).toMatchObject({ type: 'fs_error' })
    })
  })

  // -------------------------------------------------------------------------
  // WriteJson / ReadJson
  // -------------------------------------------------------------------------

  describe('writeJson', () => {
    it('should serialize and write JSON', () => {
      const dotdir = createDotDirectoryClient({ dir: tmpDir, location: 'global', registry })

      const [error, filePath] = dotdir.writeJson('data.json', { key: 'value' })

      expect(error).toBeNull()
      const raw = readFileSync(filePath as string, 'utf8')
      expect(JSON.parse(raw)).toEqual({ key: 'value' })
    })
  })

  describe('readJson', () => {
    it('should read and parse a JSON file', () => {
      writeFileSync(join(tmpDir, 'data.json'), '{"key":"value"}')
      const dotdir = createDotDirectoryClient({ dir: tmpDir, location: 'global', registry })

      const [error, data] = dotdir.readJson('data.json')

      expect(error).toBeNull()
      expect(data).toEqual({ key: 'value' })
    })

    it('should return parse_error for invalid JSON', () => {
      writeFileSync(join(tmpDir, 'bad.json'), '{not valid}')
      const dotdir = createDotDirectoryClient({ dir: tmpDir, location: 'global', registry })

      const [error] = dotdir.readJson('bad.json')

      expect(error).toMatchObject({ type: 'parse_error' })
    })

    it('should validate with a Zod schema when provided', () => {
      const schema = z.object({ name: z.string(), version: z.number() })
      writeFileSync(join(tmpDir, 'valid.json'), '{"name":"test","version":1}')
      const dotdir = createDotDirectoryClient({ dir: tmpDir, location: 'global', registry })

      const [error, data] = dotdir.readJson('valid.json', { schema })

      expect(error).toBeNull()
      expect(data).toEqual({ name: 'test', version: 1 })
    })

    it('should return parse_error when Zod validation fails', () => {
      const schema = z.object({ name: z.string(), version: z.number() })
      writeFileSync(join(tmpDir, 'invalid.json'), '{"name":123}')
      const dotdir = createDotDirectoryClient({ dir: tmpDir, location: 'global', registry })

      const [error] = dotdir.readJson('invalid.json', { schema })

      expect(error).toMatchObject({ type: 'parse_error' })
    })
  })

  // -------------------------------------------------------------------------
  // Exists
  // -------------------------------------------------------------------------

  describe('exists', () => {
    it('should return true when the file exists', () => {
      writeFileSync(join(tmpDir, 'test.txt'), 'x')
      const dotdir = createDotDirectoryClient({ dir: tmpDir, location: 'global', registry })

      expect(dotdir.exists('test.txt')).toBeTruthy()
    })

    it('should return false when the file does not exist', () => {
      const dotdir = createDotDirectoryClient({ dir: tmpDir, location: 'global', registry })

      expect(dotdir.exists('missing.txt')).toBeFalsy()
    })
  })

  // -------------------------------------------------------------------------
  // Remove
  // -------------------------------------------------------------------------

  describe('remove', () => {
    it('should remove an existing file', () => {
      writeFileSync(join(tmpDir, 'temp.txt'), 'data')
      const dotdir = createDotDirectoryClient({ dir: tmpDir, location: 'global', registry })

      const [error, filePath] = dotdir.remove('temp.txt')

      expect(error).toBeNull()
      expect(filePath).toBe(join(tmpDir, 'temp.txt'))
      expect(existsSync(join(tmpDir, 'temp.txt'))).toBeFalsy()
    })

    it('should succeed when the file does not exist', () => {
      const dotdir = createDotDirectoryClient({ dir: tmpDir, location: 'global', registry })

      const [error, filePath] = dotdir.remove('nonexistent.txt')

      expect(error).toBeNull()
      expect(filePath).toBe(join(tmpDir, 'nonexistent.txt'))
    })
  })

  // -------------------------------------------------------------------------
  // Path
  // -------------------------------------------------------------------------

  describe('path', () => {
    it('should return the full absolute path for a filename', () => {
      const dotdir = createDotDirectoryClient({ dir: tmpDir, location: 'global', registry })

      const [error, filePath] = dotdir.path('config.json')

      expect(error).toBeNull()
      expect(filePath).toBe(join(tmpDir, 'config.json'))
    })
  })

  // -------------------------------------------------------------------------
  // Path traversal
  // -------------------------------------------------------------------------

  describe('path traversal', () => {
    it('should reject read with a traversal filename', () => {
      const dotdir = createDotDirectoryClient({ dir: tmpDir, location: 'global', registry })

      const [error] = dotdir.read('../../../etc/passwd')

      expect(error).toMatchObject({ type: 'path_traversal' })
    })

    it('should reject write with a traversal filename', () => {
      const dotdir = createDotDirectoryClient({ dir: tmpDir, location: 'global', registry })

      const [error] = dotdir.write('../escape.txt', 'malicious')

      expect(error).toMatchObject({ type: 'path_traversal' })
    })

    it('should reject remove with a traversal filename', () => {
      const dotdir = createDotDirectoryClient({ dir: tmpDir, location: 'global', registry })

      const [error] = dotdir.remove('../escape.txt')

      expect(error).toMatchObject({ type: 'path_traversal' })
    })

    it('should reject readJson with a traversal filename', () => {
      const dotdir = createDotDirectoryClient({ dir: tmpDir, location: 'global', registry })

      const [error] = dotdir.readJson('../../../etc/shadow')

      expect(error).toMatchObject({ type: 'path_traversal' })
    })

    it('should return false for exists with a traversal filename', () => {
      const dotdir = createDotDirectoryClient({ dir: tmpDir, location: 'global', registry })

      expect(dotdir.exists('../../../etc/passwd')).toBeFalsy()
    })
  })

  // -------------------------------------------------------------------------
  // Protection
  // -------------------------------------------------------------------------

  describe('protection', () => {
    it('should block read on a protected file', () => {
      writeFileSync(join(tmpDir, 'auth.json'), '{"token":"secret"}')
      registry.add({ filename: 'auth.json', location: 'global' })
      const dotdir = createDotDirectoryClient({ dir: tmpDir, location: 'global', registry })

      const [error] = dotdir.read('auth.json')

      expect(error).toMatchObject({ type: 'protected_file' })
    })

    it('should allow read on a protected file with dangerouslyAccessProtectedFile', () => {
      writeFileSync(join(tmpDir, 'auth.json'), '{"token":"secret"}')
      registry.add({ filename: 'auth.json', location: 'global' })
      const dotdir = createDotDirectoryClient({ dir: tmpDir, location: 'global', registry })

      const [error, content] = dotdir.read('auth.json', { dangerouslyAccessProtectedFile: true })

      expect(error).toBeNull()
      expect(content).toBe('{"token":"secret"}')
    })

    it('should block write on a protected file', () => {
      registry.add({ filename: 'auth.json', location: 'global' })
      const dotdir = createDotDirectoryClient({ dir: tmpDir, location: 'global', registry })

      const [error] = dotdir.write('auth.json', 'overwrite')

      expect(error).toMatchObject({ type: 'protected_file' })
    })

    it('should block remove on a protected file', () => {
      writeFileSync(join(tmpDir, 'auth.json'), '{}')
      registry.add({ filename: 'auth.json', location: 'global' })
      const dotdir = createDotDirectoryClient({ dir: tmpDir, location: 'global', registry })

      const [error] = dotdir.remove('auth.json')

      expect(error).toMatchObject({ type: 'protected_file' })
    })

    it('should block readJson on a protected file', () => {
      writeFileSync(join(tmpDir, 'auth.json'), '{}')
      registry.add({ filename: 'auth.json', location: 'global' })
      const dotdir = createDotDirectoryClient({ dir: tmpDir, location: 'global', registry })

      const [error] = dotdir.readJson('auth.json')

      expect(error).toMatchObject({ type: 'protected_file' })
    })

    it('should block writeJson on a protected file', () => {
      registry.add({ filename: 'auth.json', location: 'global' })
      const dotdir = createDotDirectoryClient({ dir: tmpDir, location: 'global', registry })

      const [error] = dotdir.writeJson('auth.json', { token: 'new' })

      expect(error).toMatchObject({ type: 'protected_file' })
    })

    it('should not block exists on a protected file', () => {
      writeFileSync(join(tmpDir, 'auth.json'), '{}')
      registry.add({ filename: 'auth.json', location: 'global' })
      const dotdir = createDotDirectoryClient({ dir: tmpDir, location: 'global', registry })

      expect(dotdir.exists('auth.json')).toBeTruthy()
    })

    it('should not block path on a protected file', () => {
      registry.add({ filename: 'auth.json', location: 'global' })
      const dotdir = createDotDirectoryClient({ dir: tmpDir, location: 'global', registry })

      const [error, filePath] = dotdir.path('auth.json')

      expect(error).toBeNull()
      expect(filePath).toBe(join(tmpDir, 'auth.json'))
    })

    it('should not block files in a different location', () => {
      writeFileSync(join(tmpDir, 'auth.json'), '{"token":"secret"}')
      registry.add({ filename: 'auth.json', location: 'local' })
      const dotdir = createDotDirectoryClient({ dir: tmpDir, location: 'global', registry })

      const [error, content] = dotdir.read('auth.json')

      expect(error).toBeNull()
      expect(content).toBe('{"token":"secret"}')
    })
  })
})
