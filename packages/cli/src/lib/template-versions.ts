import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { attempt, err, ok } from '@kidd-cli/utils/fp'
import type { Result } from '@kidd-cli/utils/fp'
import { parse } from 'yaml'
import { z } from 'zod'

/**
 * Zod schema for the `catalog` field in `pnpm-workspace.yaml`.
 *
 * @private
 */
const catalogSchema = z.object({
  catalog: z.object({
    tsdown: z.string(),
    typescript: z.string(),
    vitest: z.string(),
    zod: z.string(),
  }),
})

/**
 * Resolved template dependency versions read from the workspace catalog.
 */
export interface TemplateVersions {
  readonly tsdownVersion: string
  readonly typescriptVersion: string
  readonly vitestVersion: string
  readonly zodVersion: string
}

/**
 * Known locations for `pnpm-workspace.yaml` relative to this module.
 *
 * - First path covers the built `dist/` layout (yaml copied to `dist/`).
 * - Second path covers running from source `src/lib/` during development.
 *
 * @private
 */
const CANDIDATE_PATHS: readonly string[] = [
  join(import.meta.dirname, '..', 'pnpm-workspace.yaml'),
  join(import.meta.dirname, '..', '..', '..', '..', 'pnpm-workspace.yaml'),
]

/**
 * Locate `pnpm-workspace.yaml` by checking known candidate paths.
 *
 * @returns The resolved path, or `null` when no candidate exists.
 * @private
 */
function findWorkspaceYaml(): string | null {
  return CANDIDATE_PATHS.find(existsSync) ?? null
}

/**
 * Range operator prefixes recognized in version strings.
 *
 * @private
 */
const RANGE_PREFIXES = ['^', '~', '>', '<', '='] as const

/**
 * Normalize a version string to always include a caret range prefix.
 *
 * If the version already starts with a range operator (`^`, `~`, `>`, `<`, `=`)
 * it is returned as-is. Otherwise a `^` prefix is added.
 *
 * @param version - The raw version string from the catalog.
 * @returns The version prefixed with `^` when no range operator is present.
 */
export function normalizeVersion(version: string): string {
  const hasRange = RANGE_PREFIXES.some((prefix) => version.startsWith(prefix))
  if (hasRange) {
    return version
  }
  return `^${version}`
}

/**
 * Read template dependency versions from the workspace catalog (`pnpm-workspace.yaml`).
 *
 * Resolves the workspace file from known relative locations, parses the YAML,
 * validates the structure with Zod, and returns normalized version strings
 * suitable for scaffolding `package.json` files in new projects.
 *
 * @returns A `Result` tuple with the resolved versions or an error.
 */
export function readTemplateVersions(): Result<TemplateVersions> {
  const yamlPath = findWorkspaceYaml()
  if (yamlPath === null) {
    return err(new Error('Could not locate pnpm-workspace.yaml'))
  }

  const [readError, content] = attempt(() => readFileSync(yamlPath, 'utf8'))
  if (readError) {
    return err(readError)
  }

  const [parseError, rawParsed] = attempt(() => parse(content as string) as unknown)
  if (parseError) {
    return err(parseError)
  }

  const validation = catalogSchema.safeParse(rawParsed)
  if (!validation.success) {
    return err(new Error(`Invalid pnpm-workspace.yaml catalog: ${validation.error.message}`))
  }

  const { catalog } = validation.data

  return ok(
    Object.freeze({
      tsdownVersion: normalizeVersion(catalog.tsdown),
      typescriptVersion: normalizeVersion(catalog.typescript),
      vitestVersion: normalizeVersion(catalog.vitest),
      zodVersion: normalizeVersion(catalog.zod),
    })
  )
}
