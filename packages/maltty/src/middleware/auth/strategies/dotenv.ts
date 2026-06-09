import { readFileSync } from 'node:fs'

import { parse } from 'dotenv'
import { attempt } from 'es-toolkit'

import { createBearerCredential, isValidToken } from '../credential.js'
import type { AuthCredential } from '../types.js'

/**
 * Resolve a bearer credential from a `.env` file without mutating `process.env`.
 *
 * Reads the file and parses it with `dotenv.parse`. If the target variable
 * is present, returns a bearer credential. Otherwise returns null.
 *
 * Skips a separate existence check to avoid a TOCTOU race — if the file
 * does not exist, `readFileSync` throws and `attempt` captures the error.
 *
 * @param options - Options with the env variable name and file path.
 * @returns A bearer credential if found, null otherwise.
 */
export function resolveFromDotenv(options: {
  readonly tokenVar: string
  readonly path: string
}): AuthCredential | null {
  const [readError, content] = attempt(() => readFileSync(options.path, 'utf8'))

  if (readError || content === null) {
    return null
  }

  const parsed = parse(content)
  const token = parsed[options.tokenVar]

  if (!isValidToken(token)) {
    return null
  }

  return createBearerCredential(token)
}
