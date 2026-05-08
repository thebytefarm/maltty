import { toError } from '@kidd-cli/utils/fp'

/**
 * Build a descriptive error message for a failed tsdown operation.
 *
 * When verbose is false only a short header is returned. When verbose is true
 * the underlying error message is appended so callers get actionable detail.
 *
 * @param params - The phase, error, and verbose flag.
 * @returns A formatted error message.
 */
export function formatBuildError(params: {
  readonly phase: 'build' | 'watch'
  readonly error: unknown
  readonly verbose: boolean
}): string {
  const header = `tsdown ${params.phase} failed`
  const detail = toError(params.error).message.trim()

  if (params.verbose && detail.length > 0) {
    return `${header}\n${detail}`
  }
  return header
}
