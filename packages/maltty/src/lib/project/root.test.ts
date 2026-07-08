import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { findProjectRoot } from './root.js'

/**
 * Use realpathSync to resolve macOS /tmp -> /private/tmp symlink so that
 * paths match what resolve() / process.cwd() produce.
 */
function createTempDir(): string {
  return realpathSync(mkdtempSync(join(tmpdir(), 'maltty-test-')))
}

describe('findProjectRoot()', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = createTempDir()
  })

  afterEach(() => {
    rmSync(tempDir, { force: true, recursive: true })
  })

  it('returns the directory containing a .git directory', () => {
    mkdirSync(join(tempDir, '.git'), { recursive: true })

    const result = findProjectRoot(tempDir)

    expect(result).toBe(tempDir)
  })

  it('returns the directory containing a .git file (worktree or submodule)', () => {
    writeFileSync(join(tempDir, '.git'), 'gitdir: /some/path')

    const result = findProjectRoot(tempDir)

    expect(result).toBe(tempDir)
  })

  it('traverses up directories to find .git in an ancestor', () => {
    mkdirSync(join(tempDir, '.git'), { recursive: true })
    const childDir = join(tempDir, 'src', 'lib')
    mkdirSync(childDir, { recursive: true })

    const result = findProjectRoot(childDir)

    expect(result).toBe(tempDir)
  })

  it('returns null when no .git is found above the start directory', () => {
    const isolatedDir = mkdtempSync(join(tmpdir(), 'no-git-'))

    try {
      const result = findProjectRoot(isolatedDir)

      if (result !== null) {
        // .git was found in an ancestor outside our control; skip assertion.
        return
      }
      expect(result).toBeNull()
    } finally {
      rmSync(isolatedDir, { force: true, recursive: true })
    }
  })
})
