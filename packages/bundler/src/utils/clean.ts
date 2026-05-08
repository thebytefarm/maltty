import { join } from 'node:path'

import { compileTargets } from '@kidd-cli/config/utils'
import { fs } from '@kidd-cli/utils/node'
import { match } from 'ts-pattern'

import { BUILD_ARTIFACT_EXTENSIONS } from '../constants.js'
import type { ResolvedBundlerConfig } from '../types.js'

/**
 * Result of a targeted clean operation.
 */
interface CleanResult {
  readonly removed: readonly string[]
  readonly foreign: readonly string[]
}

/**
 * Remove kidd build artifacts from the output directory.
 *
 * Removes files matching known build artifact extensions (`.js`, `.mjs`,
 * `.js.map`, `.mjs.map`). When compile mode is active, also removes the
 * exact binary files that would be produced based on the resolved compile
 * name and targets.
 *
 * @param params - The resolved config and whether compile mode is active.
 * @returns A {@link CleanResult} describing what was removed and what was skipped.
 */
export async function clean(params: {
  readonly resolved: ResolvedBundlerConfig
  readonly compile: boolean
}): Promise<CleanResult> {
  const [listError, entries] = await fs.list(params.resolved.buildOutDir)
  if (listError) {
    return { foreign: [], removed: [] }
  }

  const binaryNames = match(params)
    .with({ compile: true }, ({ resolved }) =>
      buildBinaryNames(resolved.compile.name, resolved.compile.targets)
    )
    .otherwise(() => new Set<string>())

  const results = await Promise.all(
    entries.map(async (name) => {
      const shouldRemove = isBuildArtifact(name) || binaryNames.has(name)
      if (shouldRemove) {
        const [removeError] = await fs.remove(join(params.resolved.buildOutDir, name))
        if (removeError) {
          return { type: 'foreign' as const, name }
        }
        return { type: 'removed' as const, name }
      }
      return { type: 'foreign' as const, name }
    })
  )

  return {
    removed: results.filter((r) => r.type === 'removed').map((r) => r.name),
    foreign: results.filter((r) => r.type === 'foreign').map((r) => r.name),
  }
}

/**
 * Check whether a filename matches a known build artifact extension.
 *
 * @private
 * @param filename - The filename to check.
 * @returns `true` when the file ends with a known build artifact extension.
 */
function isBuildArtifact(filename: string): boolean {
  return BUILD_ARTIFACT_EXTENSIONS.some((ext) => filename.endsWith(ext))
}

/**
 * Build the set of exact binary filenames that compile would produce.
 *
 * Single-target builds produce `{name}`, multi-target builds produce
 * `{name}-{target}`. Windows targets append `.exe` to match the file bun
 * actually creates on disk.
 *
 * @private
 * @param name - The resolved binary base name.
 * @param targets - The resolved compile targets (may be empty → defaults used).
 * @returns A set of filenames to remove.
 */
function buildBinaryNames(name: string, targets: readonly string[]): ReadonlySet<string> {
  const resolvedTargets = match(targets)
    .with([], () => compileTargets.filter((t) => t.default).map((t) => t.target))
    .otherwise(() => targets)

  const names = resolvedTargets.map((target) => {
    const base = match(resolvedTargets.length)
      .with(1, () => name)
      .otherwise(() => `${name}-${target}`)

    if (target.startsWith('windows-')) {
      return `${base}.exe`
    }
    return base
  })

  return new Set(names)
}
