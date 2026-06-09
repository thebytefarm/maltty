import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

import { attempt } from '@maltty/utils/fp'

/**
 * Walk up the directory tree to find the nearest git project root.
 *
 * Stops at the first directory containing a `.git` entry (either a `.git`
 * directory in a normal clone, or a `.git` file in a worktree or submodule).
 *
 * @param startDir - Directory to start searching from (defaults to cwd).
 * @returns The absolute path of the project root, or null if none is found.
 */
export function findProjectRoot(startDir: string = process.cwd()): string | null {
  const findRootRecursive = (currentDir: string, visited: Set<string>): string | null => {
    if (visited.has(currentDir)) {
      return null
    }
    const nextVisited = new Set([...visited, currentDir])

    const gitPath = join(currentDir, '.git')
    const [, exists] = attempt(() => existsSync(gitPath))

    if (exists) {
      return currentDir
    }

    const parent = dirname(currentDir)
    if (parent === currentDir) {
      return null
    }
    return findRootRecursive(parent, nextVisited)
  }

  return findRootRecursive(resolve(startDir), new Set())
}
