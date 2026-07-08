import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createDotDirectory } from './create-dot-directory.js'

/**
 * Shared mutable state for the homedir mock.
 *
 * `vi.mock` is hoisted and must reference module-scoped state.
 * The `let` binding is required by the mock closure and is reassigned
 * per-test in `beforeEach`. This is an accepted exception to the
 * no-`let` rule for test infrastructure.
 */
let globalHome: string
let tmpDir: string

vi.mock(import('node:os'), async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    homedir: () => globalHome,
  }
})

describe('createDotDirectory()', () => {
  const DIR_NAME = '.myapp'

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'maltty-dotdir-client-'))
    mkdirSync(join(tmpDir, '.git'), { recursive: true })
    globalHome = mkdtempSync(join(tmpdir(), 'maltty-dotdir-client-global-'))
  })

  afterEach(() => {
    rmSync(tmpDir, { force: true, recursive: true })
    rmSync(globalHome, { force: true, recursive: true })
  })

  // -------------------------------------------------------------------------
  // Global
  // -------------------------------------------------------------------------

  describe('global', () => {
    it('should return a DotDirectoryClient with the global path', () => {
      const client = createDotDirectory({ dirs: { global: DIR_NAME, local: DIR_NAME } })

      const dotdir = client.global()

      expect(dotdir.dir).toBe(join(globalHome, DIR_NAME))
    })
  })

  // -------------------------------------------------------------------------
  // Local
  // -------------------------------------------------------------------------

  describe('local', () => {
    it('should return a DotDirectoryClient when inside a project root', () => {
      vi.spyOn(process, 'cwd').mockReturnValue(tmpDir)
      const client = createDotDirectory({ dirs: { global: DIR_NAME, local: DIR_NAME } })

      const [error, dotdir] = client.local()

      expect(error).toBeNull()
      expect(dotdir.dir).toBe(join(tmpDir, DIR_NAME))
    })
  })

  // -------------------------------------------------------------------------
  // Protect
  // -------------------------------------------------------------------------

  describe('protect', () => {
    it('should protect a file across DotDirectoryClient instances from the same DotDirectory', () => {
      const client = createDotDirectory({ dirs: { global: DIR_NAME, local: DIR_NAME } })
      const globalDir = join(globalHome, DIR_NAME)
      mkdirSync(globalDir, { recursive: true })
      writeFileSync(join(globalDir, 'auth.json'), '{"token":"secret"}')

      client.protect({ filename: 'auth.json', location: 'global' })
      const dotdir = client.global()

      const [error] = dotdir.read('auth.json')
      expect(error).toMatchObject({ type: 'protected_file' })
    })

    it('should allow access to protected files with dangerouslyAccessProtectedFile', () => {
      const client = createDotDirectory({ dirs: { global: DIR_NAME, local: DIR_NAME } })
      const globalDir = join(globalHome, DIR_NAME)
      mkdirSync(globalDir, { recursive: true })
      writeFileSync(join(globalDir, 'auth.json'), '{"token":"secret"}')

      client.protect({ filename: 'auth.json', location: 'global' })
      const dotdir = client.global()

      const [error, content] = dotdir.read('auth.json', { dangerouslyAccessProtectedFile: true })
      expect(error).toBeNull()
      expect(content).toBe('{"token":"secret"}')
    })
  })
})
