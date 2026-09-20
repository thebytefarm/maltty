import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { match } from 'ts-pattern'
import { describe, expect, it } from 'vitest'

interface ReadBundleGraphArgs {
  readonly filePath: string
  readonly visited?: readonly string[]
}

const DIST_DIR = fileURLToPath(new URL('../../dist', import.meta.url))
const LOCAL_IMPORT_PATTERNS = [
  /from\s+["'](\.\.?\/[^"']+)["']/g,
  /import\s+["'](\.\.?\/[^"']+)["']/g,
  /import\(\s*["'](\.\.?\/[^"']+)["']\s*\)/g,
] as const

/**
 * Read an emitted bundle and its local chunk graph without revisiting cycles.
 *
 * @private
 * @param args - Bundle path and paths already visited during traversal.
 * @returns Source text for the bundle and each reachable local chunk.
 */
function readBundleGraph({ filePath, visited = [] }: ReadBundleGraphArgs): readonly string[] {
  return match(visited.includes(filePath))
    .with(true, () => [])
    .with(false, () => {
      const source = fs.readFileSync(filePath, 'utf8')
      const imports = LOCAL_IMPORT_PATTERNS.flatMap((pattern) =>
        [...source.matchAll(pattern)].map((result) =>
          path.resolve(path.dirname(filePath), result[1] ?? '')
        )
      )

      return [
        source,
        ...imports.flatMap((importPath) =>
          readBundleGraph({ filePath: importPath, visited: [...visited, filePath] })
        ),
      ]
    })
    .exhaustive()
}

describe('@maltty/tui/spinner bundle isolation', () => {
  it('should exclude prompts, stories, and the maltty runtime', () => {
    const bundle = readBundleGraph({ filePath: path.join(DIST_DIR, 'spinner.js') }).join('\n')

    expect(bundle).not.toContain('src/prompts')
    expect(bundle).not.toContain('@maltty/stories')
    expect(bundle).not.toMatch(/from\s+["']maltty(?:\/|["'])/)
  })
})
