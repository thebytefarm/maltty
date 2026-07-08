import { dirname, join } from 'node:path'

import { ok } from '@maltty/utils/fp'
import type { ResultAsync } from '@maltty/utils/fp'
import { fs } from '@maltty/utils/node'

import type { GenerateError, RenderedFile, WriteFilesParams, WriteResult } from './types.js'

/**
 * Write rendered files to disk with optional conflict detection.
 *
 * For each file, resolves the target path under `outputDir`, creates parent
 * directories as needed, and writes the content. When `overwrite` is false,
 * existing files are skipped rather than overwritten.
 *
 * @param params - Files to write, target directory, and overwrite flag.
 * @returns An async Result with counts of written/skipped files or a GenerateError.
 */
export async function writeFiles(
  params: WriteFilesParams
): ResultAsync<WriteResult, GenerateError> {
  const results = await Promise.all(
    params.files.map((file) => writeSingleFile(file, params.outputDir, params.overwrite))
  )

  const firstError = results.find((r): r is readonly [GenerateError, null] => r[0] !== null)
  if (firstError) {
    return [firstError[0], null]
  }

  const validStatuses = results.filter((r): r is readonly [null, FileWriteStatus] => r[1] !== null)

  const written = validStatuses
    .filter(([, status]) => status.action === 'written')
    .map(([, status]) => status.path)

  const skipped = validStatuses
    .filter(([, status]) => status.action === 'skipped')
    .map(([, status]) => status.path)

  return ok({ skipped, written })
}

/**
 * Status of a single file write operation.
 *
 * Tracks the path and whether the file was written or skipped.
 */
interface FileWriteStatus {
  readonly path: string
  readonly action: 'written' | 'skipped'
}

/**
 * Write a single rendered file to disk.
 *
 * @param file - The rendered file to write.
 * @param outputDir - The root output directory.
 * @param overwrite - Whether to overwrite existing files.
 * @returns A Result tuple with the write status or a GenerateError.
 * @private
 */
async function writeSingleFile(
  file: RenderedFile,
  outputDir: string,
  overwrite: boolean
): ResultAsync<FileWriteStatus, GenerateError> {
  const targetPath = join(outputDir, file.relativePath)

  const pathExists = await fs.exists(targetPath)
  if (pathExists && !overwrite) {
    return ok({ action: 'skipped' as const, path: file.relativePath })
  }

  const [mkdirError] = await fs.mkdir(dirname(targetPath))
  if (mkdirError) {
    return [
      {
        message: `Failed to write file: ${mkdirError.message}`,
        path: targetPath,
        type: 'write_error' as const,
      },
      null,
    ]
  }

  const [writeError] = await fs.write(targetPath, file.content)
  if (writeError) {
    return [
      {
        message: `Failed to write file: ${writeError.message}`,
        path: targetPath,
        type: 'write_error' as const,
      },
      null,
    ]
  }

  return ok({ action: 'written' as const, path: file.relativePath })
}
