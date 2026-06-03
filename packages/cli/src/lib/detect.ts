import { join } from 'node:path'

import { ok } from '@maltty/utils/fp'
import type { ResultAsync } from '@maltty/utils/fp'
import { jsonParse } from '@maltty/utils/json'
import { fs } from '@maltty/utils/node'

import type { GenerateError, ProjectInfo } from './types.js'

/**
 * Detect whether the given directory contains a maltty-based CLI project.
 *
 * Looks for a `package.json` with `@maltty/core` listed in `dependencies` or
 * `devDependencies`, and checks for a `src/commands/` directory.
 *
 * @param cwd - The directory to inspect.
 * @returns An async Result containing project info or null when no maltty project is found.
 */
export async function detectProject(cwd: string): ResultAsync<ProjectInfo | null, GenerateError> {
  const packageJsonPath = join(cwd, 'package.json')
  const packageExists = await fs.exists(packageJsonPath)
  if (!packageExists) {
    return ok(null)
  }

  const [readError, pkg] = await readPackageJson(packageJsonPath)
  if (readError) {
    return [readError, null]
  }

  const deps = pkg.dependencies ?? {}
  const devDeps = pkg.devDependencies ?? {}
  const hasMalttyDep = '@maltty/core' in deps || '@maltty/core' in devDeps

  if (!hasMalttyDep) {
    return ok(null)
  }

  const commandsPath = join(cwd, 'src', 'commands')
  const commandsDirExists = await fs.exists(commandsPath)

  if (commandsDirExists) {
    return ok({
      commandsDir: commandsPath,
      hasMalttyDep,
      rootDir: cwd,
    })
  }

  return ok({
    commandsDir: null,
    hasMalttyDep,
    rootDir: cwd,
  })
}

/**
 * Minimal package.json shape needed for detection.
 *
 * @private
 */
interface PackageJson {
  readonly dependencies?: Record<string, string>
  readonly devDependencies?: Record<string, string>
}

/**
 * Read and parse a package.json file.
 *
 * @param filePath - Absolute path to the package.json.
 * @returns A Result tuple with the parsed package data or a GenerateError.
 * @private
 */
async function readPackageJson(filePath: string): ResultAsync<PackageJson, GenerateError> {
  const [readError, content] = await fs.read(filePath)
  if (readError) {
    return [
      {
        message: `Failed to read package.json: ${readError.message}`,
        path: filePath,
        type: 'read_error' as const,
      },
      null,
    ]
  }

  const [parseError, data] = jsonParse(content)
  if (parseError) {
    return [
      {
        message: `Failed to parse package.json: ${parseError.message}`,
        path: filePath,
        type: 'read_error' as const,
      },
      null,
    ]
  }

  return ok(data as PackageJson)
}
