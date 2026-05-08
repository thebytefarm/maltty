import pc from 'picocolors'
import { z } from 'zod'

import { GLYPHS } from './constants.js'
import type { CodeFrameInput } from './types.js'

/**
 * Zod schema for validating a code frame annotation at the public API boundary.
 *
 * @private
 */
const CodeFrameAnnotationSchema = z.object({
  column: z.number().int().positive(),
  length: z.number().int().positive(),
  line: z.number().int().positive(),
  message: z.string(),
})

/**
 * Format an annotated code frame (oxlint style).
 *
 * @param input - The code frame data to format.
 * @returns A formatted code frame string.
 */
export function formatCodeFrame(input: CodeFrameInput): string {
  const parsed = CodeFrameAnnotationSchema.safeParse(input.annotation)
  if (!parsed.success) {
    return `  ${pc.red('✗')} Invalid code frame annotation: ${parsed.error.issues.map((issue) => issue.message).join(', ')}`
  }

  const { annotation, filePath, lines, startLine } = input

  const lastLine = startLine + lines.length - 1
  if (annotation.line < startLine || annotation.line > lastLine) {
    return `[Invalid annotation: line ${String(annotation.line)} is out of range ${String(startLine)}–${String(lastLine)}]`
  }

  const gutterWidth = String(lastLine).length

  const header = `  ${pc.cyan(GLYPHS.arrow)} ${pc.cyan(`${filePath}:${String(annotation.line)}:${String(annotation.column)}`)}`

  const separator = `  ${' '.repeat(gutterWidth)} ${pc.cyan(GLYPHS.pipe)}`

  const codeLines = lines.map((line, idx) => {
    const lineNum = startLine + idx
    const gutter = pc.cyan(String(lineNum).padStart(gutterWidth))
    return `  ${gutter} ${pc.cyan(GLYPHS.pipe)} ${line}`
  })

  const annotationLineIdx = annotation.line - startLine
  const pointer = ' '.repeat(annotation.column - 1) + pc.red('^'.repeat(annotation.length))
  const annotationRow = `  ${' '.repeat(gutterWidth)} ${pc.cyan(GLYPHS.pipe)} ${pointer} ${pc.red(annotation.message)}`

  const outputLines = codeLines.reduce<readonly string[]>((acc, line, idx) => {
    if (idx === annotationLineIdx) {
      return [...acc, line, annotationRow]
    }
    return [...acc, line]
  }, [])

  return [header, separator, ...outputLines, separator].join('\n')
}
