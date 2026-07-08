import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createStore } from './create-store.js'

/*
 * We mock `node:os` so that `homedir()` returns our controlled temp directory.
 * The actual store module (and its transitive dependency `findProjectRoot`)
 * import `homedir` from `node:os`, so this mock ensures the global store
 * directory resolves to a predictable location.
 */
let globalHome: string

vi.mock(import('node:os'), async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    homedir: () => globalHome,
  }
})

describe('createStore()', () => {
  let tmpDir: string
  let globalDir: string
  const DIR_NAME = '.myapp'

  beforeEach(() => {
    // Create a temp directory that simulates a git repo with a .git directory
    tmpDir = mkdtempSync(join(tmpdir(), 'maltty-store-'))

    // Create .git directory so findProjectRoot detects this as a project root
    mkdirSync(join(tmpDir, '.git'), { recursive: true })

    // Create the local config directory
    mkdirSync(join(tmpDir, DIR_NAME), { recursive: true })

    // Create a separate directory for the global home
    globalHome = mkdtempSync(join(tmpdir(), 'maltty-store-global-'))
    globalDir = join(globalHome, DIR_NAME)
    mkdirSync(globalDir, { recursive: true })
  })

  afterEach(() => {
    rmSync(tmpDir, { force: true, recursive: true })
    rmSync(globalHome, { force: true, recursive: true })
  })

  // -------------------------------------------------------------------------
  // GetLocalDir
  // -------------------------------------------------------------------------

  describe('getLocalDir', () => {
    it('returns path joining project root with dirName when in a git repo', () => {
      const store = createStore({ dirName: DIR_NAME })

      const localDir = store.getLocalDir(tmpDir)

      expect(localDir).toBe(join(tmpDir, DIR_NAME))
    })

    it('returns null when not in a git repo', () => {
      // Create a directory with no .git anywhere in its ancestry
      const noGitDir = mkdtempSync(join(tmpdir(), 'maltty-store-nogit-'))
      try {
        const store = createStore({ dirName: DIR_NAME })

        const localDir = store.getLocalDir(noGitDir)

        expect(localDir).toBeNull()
      } finally {
        rmSync(noGitDir, { force: true, recursive: true })
      }
    })
  })

  // -------------------------------------------------------------------------
  // GetGlobalDir
  // -------------------------------------------------------------------------

  describe('getGlobalDir', () => {
    it('returns path joining homedir with dirName', () => {
      const store = createStore({ dirName: DIR_NAME })

      const result = store.getGlobalDir()

      expect(result).toBe(join(globalHome, DIR_NAME))
    })
  })

  // -------------------------------------------------------------------------
  // LoadRaw
  // -------------------------------------------------------------------------

  describe('loadRaw', () => {
    it("source='local': loads raw content from local dir", () => {
      const content = '{"key":"local-value"}'
      writeFileSync(join(tmpDir, DIR_NAME, 'settings.json'), content)
      const store = createStore({ dirName: DIR_NAME })

      const result = store.loadRaw('settings.json', {
        source: 'local',
        startDir: tmpDir,
      })

      expect(result).toBe(content)
    })

    it("source='local': returns null when no local dir (not in git repo)", () => {
      const noGitDir = mkdtempSync(join(tmpdir(), 'maltty-store-nogit-'))
      try {
        const store = createStore({ dirName: DIR_NAME })

        const result = store.loadRaw('settings.json', {
          source: 'local',
          startDir: noGitDir,
        })

        expect(result).toBeNull()
      } finally {
        rmSync(noGitDir, { force: true, recursive: true })
      }
    })

    it("source='global': loads raw content from global dir", () => {
      const content = '{"key":"global-value"}'
      writeFileSync(join(globalDir, 'settings.json'), content)
      const store = createStore({ dirName: DIR_NAME })

      const result = store.loadRaw('settings.json', {
        source: 'global',
        startDir: tmpDir,
      })

      expect(result).toBe(content)
    })

    it("source='resolve': tries local first, falls back to global", () => {
      // Only write to global, so resolve should fall back
      const globalContent = '{"key":"global-fallback"}'
      writeFileSync(join(globalDir, 'settings.json'), globalContent)
      const store = createStore({ dirName: DIR_NAME })

      const result = store.loadRaw('settings.json', {
        source: 'resolve',
        startDir: tmpDir,
      })

      expect(result).toBe(globalContent)
    })

    it("source='resolve': prefers local over global", () => {
      const localContent = '{"key":"local-value"}'
      const globalContent = '{"key":"global-value"}'
      writeFileSync(join(tmpDir, DIR_NAME, 'settings.json'), localContent)
      writeFileSync(join(globalDir, 'settings.json'), globalContent)
      const store = createStore({ dirName: DIR_NAME })

      const result = store.loadRaw('settings.json', {
        source: 'resolve',
        startDir: tmpDir,
      })

      expect(result).toBe(localContent)
    })

    it("source='resolve': returns null when file doesn't exist in either location", () => {
      const store = createStore({ dirName: DIR_NAME })

      const result = store.loadRaw('nonexistent.json', {
        source: 'resolve',
        startDir: tmpDir,
      })

      expect(result).toBeNull()
    })

    it("returns null when file doesn't exist", () => {
      const store = createStore({ dirName: DIR_NAME })

      const result = store.loadRaw('missing.json', {
        source: 'local',
        startDir: tmpDir,
      })

      expect(result).toBeNull()
    })

    it('defaults to resolve source when no options provided', () => {
      const localContent = '{"key":"local"}'
      writeFileSync(join(tmpDir, DIR_NAME, 'settings.json'), localContent)
      const store = createStore({ dirName: DIR_NAME })

      // Use startDir so findProjectRoot resolves inside our tmpDir
      const result = store.loadRaw('settings.json', { startDir: tmpDir })

      expect(result).toBe(localContent)
    })
  })

  // -------------------------------------------------------------------------
  // Load
  // -------------------------------------------------------------------------

  describe('load', () => {
    it('parses JSON and returns data', () => {
      const data = { name: 'test', version: 1 }
      writeFileSync(join(tmpDir, DIR_NAME, 'settings.json'), JSON.stringify(data))
      const store = createStore({ dirName: DIR_NAME })

      const result = store.load('settings.json', {
        source: 'local',
        startDir: tmpDir,
      })

      expect(result).toStrictEqual(data)
    })

    it('returns defaults when file not found', () => {
      const defaults = { name: 'default', version: 0 }
      const store = createStore({ defaults, dirName: DIR_NAME })

      const result = store.load('nonexistent.json', {
        source: 'local',
        startDir: tmpDir,
      })

      expect(result).toStrictEqual(defaults)
    })

    it('returns null when no file and no defaults', () => {
      const store = createStore({ dirName: DIR_NAME })

      const result = store.load('nonexistent.json', {
        source: 'local',
        startDir: tmpDir,
      })

      expect(result).toBeNull()
    })

    it('merges defaults with parsed data', () => {
      const defaults = { extra: true, name: 'default', version: 0 }
      const fileData = { name: 'from-file', version: 2 }
      writeFileSync(join(tmpDir, DIR_NAME, 'settings.json'), JSON.stringify(fileData))
      const store = createStore({ defaults, dirName: DIR_NAME })

      const result = store.load('settings.json', {
        source: 'local',
        startDir: tmpDir,
      })

      expect(result).toStrictEqual({ extra: true, name: 'from-file', version: 2 })
    })

    it('returns defaults on JSON parse error', () => {
      const defaults = { name: 'default', version: 0 }
      writeFileSync(join(tmpDir, DIR_NAME, 'settings.json'), '{invalid json!!!')
      const store = createStore({ defaults, dirName: DIR_NAME })

      const result = store.load('settings.json', {
        source: 'local',
        startDir: tmpDir,
      })

      expect(result).toStrictEqual(defaults)
    })

    it('returns null on parse error with no defaults', () => {
      writeFileSync(join(tmpDir, DIR_NAME, 'settings.json'), 'not-json')
      const store = createStore({ dirName: DIR_NAME })

      const result = store.load('settings.json', {
        source: 'local',
        startDir: tmpDir,
      })

      expect(result).toBeNull()
    })
  })

  // -------------------------------------------------------------------------
  // GetFilePath
  // -------------------------------------------------------------------------

  describe('getFilePath', () => {
    it("source='local': returns path when file exists", () => {
      writeFileSync(join(tmpDir, DIR_NAME, 'settings.json'), '{}')
      const store = createStore({ dirName: DIR_NAME })

      const result = store.getFilePath('settings.json', {
        source: 'local',
        startDir: tmpDir,
      })

      expect(result).toBe(join(tmpDir, DIR_NAME, 'settings.json'))
    })

    it("source='local': returns null when no local dir (not in git repo)", () => {
      const noGitDir = mkdtempSync(join(tmpdir(), 'maltty-store-nogit-'))
      try {
        const store = createStore({ dirName: DIR_NAME })

        const result = store.getFilePath('settings.json', {
          source: 'local',
          startDir: noGitDir,
        })

        expect(result).toBeNull()
      } finally {
        rmSync(noGitDir, { force: true, recursive: true })
      }
    })

    it("source='local': returns null when file does not exist", () => {
      const store = createStore({ dirName: DIR_NAME })

      const result = store.getFilePath('nonexistent.json', {
        source: 'local',
        startDir: tmpDir,
      })

      expect(result).toBeNull()
    })

    it("source='global': returns path when file exists", () => {
      writeFileSync(join(globalDir, 'settings.json'), '{}')
      const store = createStore({ dirName: DIR_NAME })

      const result = store.getFilePath('settings.json', {
        source: 'global',
      })

      expect(result).toBe(join(globalDir, 'settings.json'))
    })

    it("source='global': returns null when file does not exist", () => {
      const store = createStore({ dirName: DIR_NAME })

      const result = store.getFilePath('missing.json', {
        source: 'global',
      })

      expect(result).toBeNull()
    })

    it("source='resolve': finds local file first", () => {
      writeFileSync(join(tmpDir, DIR_NAME, 'settings.json'), '{}')
      writeFileSync(join(globalDir, 'settings.json'), '{}')
      const store = createStore({ dirName: DIR_NAME })

      const result = store.getFilePath('settings.json', {
        source: 'resolve',
        startDir: tmpDir,
      })

      expect(result).toBe(join(tmpDir, DIR_NAME, 'settings.json'))
    })

    it("source='resolve': falls back to global when local file missing", () => {
      writeFileSync(join(globalDir, 'settings.json'), '{}')
      const store = createStore({ dirName: DIR_NAME })

      const result = store.getFilePath('settings.json', {
        source: 'resolve',
        startDir: tmpDir,
      })

      expect(result).toBe(join(globalDir, 'settings.json'))
    })

    it("returns null when file doesn't exist in either location", () => {
      const store = createStore({ dirName: DIR_NAME })

      const result = store.getFilePath('nonexistent.json', {
        source: 'resolve',
        startDir: tmpDir,
      })

      expect(result).toBeNull()
    })

    it('defaults to resolve source when no options provided', () => {
      writeFileSync(join(tmpDir, DIR_NAME, 'settings.json'), '{}')
      const store = createStore({ dirName: DIR_NAME })

      const result = store.getFilePath('settings.json', { startDir: tmpDir })

      expect(result).toBe(join(tmpDir, DIR_NAME, 'settings.json'))
    })
  })

  // -------------------------------------------------------------------------
  // Save
  // -------------------------------------------------------------------------

  describe('save', () => {
    it("source='global': should write JSON file to global dir", () => {
      const store = createStore({ dirName: DIR_NAME })
      const data = { token: 'abc', type: 'bearer' }

      const [error, filePath] = store.save('auth.json', data, { source: 'global' })

      expect(error).toBeNull()
      expect(filePath).toBe(join(globalDir, 'auth.json'))
      expect(existsSync(filePath as string)).toBeTruthy()

      const content = readFileSync(filePath as string, 'utf8')
      expect(JSON.parse(content)).toStrictEqual(data)
    })

    it("source='local': should write JSON file to local dir", () => {
      const store = createStore({ dirName: DIR_NAME })
      const data = { key: 'value' }

      const [error, filePath] = store.save('config.json', data, {
        source: 'local',
        startDir: tmpDir,
      })

      expect(error).toBeNull()
      expect(filePath).toBe(join(tmpDir, DIR_NAME, 'config.json'))
      expect(existsSync(filePath as string)).toBeTruthy()
    })

    it("source='local': should return error when no local dir found", () => {
      const noGitDir = mkdtempSync(join(tmpdir(), 'maltty-store-nogit-'))
      try {
        const store = createStore({ dirName: DIR_NAME })

        const [error] = store.save(
          'auth.json',
          {},
          {
            source: 'local',
            startDir: noGitDir,
          }
        )

        expect(error).toBeTruthy()
      } finally {
        rmSync(noGitDir, { force: true, recursive: true })
      }
    })

    it('should default to global source', () => {
      const store = createStore({ dirName: DIR_NAME })

      const [error, filePath] = store.save('auth.json', { test: true })

      expect(error).toBeNull()
      expect(filePath).toBe(join(globalDir, 'auth.json'))
    })

    it('should create directories if they do not exist', () => {
      // Remove the global dir to ensure save creates it
      rmSync(globalDir, { force: true, recursive: true })
      const store = createStore({ dirName: DIR_NAME })

      const [error, filePath] = store.save('auth.json', { token: 'x' })

      expect(error).toBeNull()
      expect(existsSync(filePath as string)).toBeTruthy()
    })

    it('should pretty-print the JSON output', () => {
      const store = createStore({ dirName: DIR_NAME })
      const data = { a: 1, b: 2 }

      const [, filePath] = store.save('pretty.json', data)

      const content = readFileSync(filePath as string, 'utf8')
      expect(content).toContain('\n')
      expect(content).toContain('  ')
    })
  })

  // -------------------------------------------------------------------------
  // Remove
  // -------------------------------------------------------------------------

  describe('remove', () => {
    it('should remove an existing file from global dir', () => {
      writeFileSync(join(globalDir, 'auth.json'), '{"type":"bearer","token":"x"}')
      const store = createStore({ dirName: DIR_NAME })

      const [error, filePath] = store.remove('auth.json', { source: 'global' })

      expect(error).toBeNull()
      expect(filePath).toBe(join(globalDir, 'auth.json'))
      expect(existsSync(filePath as string)).toBeFalsy()
    })

    it('should return ok when file does not exist', () => {
      const store = createStore({ dirName: DIR_NAME })

      const [error, filePath] = store.remove('nonexistent.json', { source: 'global' })

      expect(error).toBeNull()
      expect(filePath).toBe(join(globalDir, 'nonexistent.json'))
    })

    it("should remove from local dir when source is 'local'", () => {
      writeFileSync(join(tmpDir, DIR_NAME, 'auth.json'), '{"type":"bearer","token":"x"}')
      const store = createStore({ dirName: DIR_NAME })

      const [error, filePath] = store.remove('auth.json', {
        source: 'local',
        startDir: tmpDir,
      })

      expect(error).toBeNull()
      expect(filePath).toBe(join(tmpDir, DIR_NAME, 'auth.json'))
      expect(existsSync(filePath as string)).toBeFalsy()
    })

    it('should return error when local dir not found', () => {
      const noGitDir = mkdtempSync(join(tmpdir(), 'maltty-store-nogit-'))
      try {
        const store = createStore({ dirName: DIR_NAME })

        const [error] = store.remove('auth.json', {
          source: 'local',
          startDir: noGitDir,
        })

        expect(error).toBeTruthy()
      } finally {
        rmSync(noGitDir, { force: true, recursive: true })
      }
    })
  })
})
