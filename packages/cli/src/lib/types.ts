import type { Result } from '@maltty/utils/fp'

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/**
 * Error shape for scaffolding and code generation failures.
 */
export interface GenerateError {
  readonly type: 'render_error' | 'write_error' | 'conflict_error' | 'read_error'
  readonly message: string
  readonly path?: string
}

/**
 * A Result tuple specialized for generation operations.
 */
export type GenerateResult<TValue> = Result<TValue, GenerateError>

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

/**
 * A single rendered template file with its relative path and content.
 */
export interface RenderedFile {
  readonly relativePath: string
  readonly content: string
}

/**
 * Parameters for rendering a directory of `.liquid` templates.
 */
export interface RenderTemplateParams {
  readonly templateDir: string
  readonly variables: Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

/**
 * Parameters for writing rendered files to disk.
 */
export interface WriteFilesParams {
  readonly files: readonly RenderedFile[]
  readonly outputDir: string
  readonly overwrite: boolean
}

/**
 * Result of a write operation, listing written and skipped file paths.
 */
export interface WriteResult {
  readonly written: readonly string[]
  readonly skipped: readonly string[]
}

// ---------------------------------------------------------------------------
// Detect
// ---------------------------------------------------------------------------

/**
 * Information about a detected maltty project in a directory.
 */
export interface ProjectInfo {
  readonly rootDir: string
  readonly commandsDir: string | null
  readonly hasMalttyDep: boolean
}
