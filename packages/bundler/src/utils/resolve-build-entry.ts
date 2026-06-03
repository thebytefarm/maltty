import { join } from 'node:path'

import { fs } from '@maltty/utils/node'
import { match } from 'ts-pattern'

/**
 * Known entry file names produced by tsdown for ESM builds, in preference order.
 */
const ENTRY_CANDIDATES = ['index.mjs', 'index.js'] as const

/**
 * Resolve the bundled entry file in a build output directory.
 *
 * tsdown may produce `index.mjs` or `index.js` depending on the project's
 * `package.json` `type` field and tsdown configuration. This function checks
 * for both candidates and returns the first one that exists on disk.
 *
 * @param outDir - Absolute path to the build output directory.
 * @returns The absolute path to the entry file, or `undefined` when none is found.
 */
export async function resolveBuildEntry(outDir: string): Promise<string | undefined> {
  const candidates = ENTRY_CANDIDATES.map((name) => join(outDir, name))

  const results = await Promise.all(
    candidates.map(async (path) => ({ path, found: await fs.exists(path) }))
  )

  const found = results.find((r) => r.found)

  return match(found)
    .with(undefined, () => undefined)
    .otherwise((entry) => entry.path)
}
