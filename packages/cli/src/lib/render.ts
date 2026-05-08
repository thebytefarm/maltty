import { readdir, readFile } from 'node:fs/promises'
import { join, relative } from 'node:path'

import { attemptAsync, ok, toError } from '@kidd-cli/utils/fp'
import type { ResultAsync } from '@kidd-cli/utils/fp'
import { Liquid } from 'liquidjs'

import type { GenerateError, RenderedFile, RenderTemplateParams } from './types.js'

/**
 * Render all `.liquid` templates in a directory using LiquidJS.
 *
 * Recursively collects `.liquid` files under `templateDir`, renders each
 * with the provided variables, and strips the `.liquid` extension from
 * the output path. Files named `gitignore.liquid` are mapped to `.gitignore`.
 *
 * @param params - Template directory and variable bindings.
 * @returns An async Result containing rendered files or a GenerateError.
 */
export async function renderTemplate(
  params: RenderTemplateParams
): ResultAsync<readonly RenderedFile[], GenerateError> {
  const engine = new Liquid({ root: params.templateDir })

  const entries = await collectLiquidFiles(params.templateDir)
  if (entries.length === 0) {
    return ok([])
  }

  const results = await Promise.all(
    entries.map(async (entry): Promise<RenderedFile | GenerateError> => {
      const absolutePath = join(params.templateDir, entry)
      const [renderError, content] = await renderSingleFile(engine, absolutePath, params.variables)
      if (renderError) {
        return renderError
      }
      const relativePath = mapOutputPath(entry)
      return { content, relativePath }
    })
  )

  const firstError = results.find(isGenerateError)
  if (firstError) {
    return [firstError as GenerateError, null]
  }

  return ok(results as readonly RenderedFile[])
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Recursively collect all `.liquid` file paths relative to root.
 *
 * @param root - The directory to scan.
 * @returns Relative paths of all `.liquid` files.
 * @private
 */
async function collectLiquidFiles(root: string): Promise<readonly string[]> {
  const dirEntries = await readdir(root, { recursive: true, withFileTypes: true })
  return dirEntries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.liquid'))
    .map((entry) => {
      const parent = entry.parentPath
      return toPosixPath(relative(root, join(parent, entry.name)))
    })
}

/**
 * Normalize a native path to use forward-slash separators.
 *
 * `path.relative()` returns separators native to the OS (`\` on Windows,
 * `/` elsewhere). Downstream consumers — the gitignore rename regex and
 * the `--no-example`/`--no-config` filters in `init` — match literal `/`,
 * so we normalize once at the boundary. Node's `path.join` accepts `/` on
 * Windows and produces correct native paths during write.
 *
 * @param p - The native path string.
 * @returns The path with all `\` replaced by `/`.
 * @private
 */
function toPosixPath(p: string): string {
  return p.replaceAll('\\', '/')
}

/**
 * Render a single `.liquid` file with the given variables.
 *
 * @param engine - The LiquidJS engine instance.
 * @param absolutePath - Absolute path to the `.liquid` file.
 * @param variables - Template variable bindings.
 * @returns A Result tuple with the rendered content or a GenerateError.
 * @private
 */
async function renderSingleFile(
  engine: Liquid,
  absolutePath: string,
  variables: Record<string, unknown>
): ResultAsync<string, GenerateError> {
  const [renderError, content] = await attemptAsync(async () => {
    const template = await readFile(absolutePath, 'utf8')
    return engine.parseAndRender(template, variables)
  })

  if (renderError) {
    return [
      {
        message: `Failed to render template: ${toError(renderError).message}`,
        path: absolutePath,
        type: 'render_error' as const,
      },
      null,
    ]
  }

  return ok(content)
}

/**
 * Map a `.liquid` relative path to its output path.
 *
 * Strips the `.liquid` extension and renames bare `gitignore` segments
 * to `.gitignore` so dotfiles survive version control.
 *
 * @param liquidPath - Relative path ending in `.liquid`.
 * @returns The output-relative path without the `.liquid` suffix.
 * @private
 */
function mapOutputPath(liquidPath: string): string {
  const stripped = liquidPath.replace(/\.liquid$/, '')
  return stripped.replaceAll(/(^|\/)gitignore($|\/)/g, '$1.gitignore$2')
}

/**
 * Type guard for GenerateError objects.
 *
 * @param value - The value to check.
 * @returns True when value has a `type` and `message` property matching GenerateError.
 * @private
 */
function isGenerateError(value: unknown): value is GenerateError {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  return 'type' in value && 'message' in value
}
