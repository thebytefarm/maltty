import { createBearerCredential, isValidToken } from '../credential.js'
import type { AuthCredential } from '../types.js'

/**
 * Resolve a bearer credential from a process environment variable.
 *
 * @param options - Options containing the environment variable name.
 * @returns A bearer credential if the variable is set, null otherwise.
 */
export function resolveFromEnv(options: { readonly tokenVar: string }): AuthCredential | null {
  const token = process.env[options.tokenVar]

  if (!isValidToken(token)) {
    return null
  }

  return createBearerCredential(token)
}
