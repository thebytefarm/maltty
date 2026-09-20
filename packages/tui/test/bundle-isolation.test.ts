import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const DIST_DIR = fileURLToPath(new URL('../dist', import.meta.url))
const LOCAL_IMPORT_PATTERN = /from\s+["'](\.\.?\/[^"']+)["']/g

function readBundleGraph(filePath: string, visited: readonly string[] = []): readonly string[] {
  if (visited.includes(filePath)) {
    return []
  }

  const source = fs.readFileSync(filePath, 'utf8')
  const imports = [...source.matchAll(LOCAL_IMPORT_PATTERN)].map((match) =>
    path.resolve(path.dirname(filePath), match[1] ?? '')
  )

  return [
    source,
    ...imports.flatMap((importPath) => readBundleGraph(importPath, [...visited, filePath])),
  ]
}

describe('@maltty/tui/spinner bundle isolation', () => {
  it('excludes prompts, stories, and the maltty runtime', () => {
    const bundle = readBundleGraph(path.join(DIST_DIR, 'spinner.js')).join('\n')

    expect(bundle).not.toContain('src/prompts')
    expect(bundle).not.toContain('@maltty/stories')
    expect(bundle).not.toMatch(/from\s+["']maltty(?:\/|["'])/)
  })
})
