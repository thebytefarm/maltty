import { ok } from '@maltty/utils/fp'
import type { ResultAsync, Result } from '@maltty/utils/fp'

import type { Prompts } from '@/context/types.js'
import { createStore } from '@/lib/store/create-store.js'
import type { ResolvedDirs } from '@/types/index.js'

import { runStrategyChain } from './chain.js'
import { DEFAULT_AUTH_FILENAME } from './constants.js'
import type {
  AuthContext,
  AuthCredential,
  AuthError,
  LoginOptions,
  StrategyConfig,
  ValidateCredential,
} from './types.js'

/**
 * Options for {@link createAuthContext}.
 */
export interface CreateAuthContextOptions {
  readonly strategies: readonly StrategyConfig[]
  readonly cliName: string
  readonly dirs: ResolvedDirs
  readonly prompts: Prompts
  readonly resolveCredential: () => AuthCredential | null
  readonly validate?: ValidateCredential
}

/**
 * Create an {@link AuthContext} value for `ctx.auth`.
 *
 * No credential data is stored on the returned object. `credential()`
 * resolves passively on every call, `authenticated()` checks existence,
 * `login()` runs the configured interactive strategies, saves the
 * credential to the global file store, and `logout()` removes it.
 *
 * @param options - Factory options.
 * @returns An AuthContext instance.
 */
export function createAuthContext(options: CreateAuthContextOptions): AuthContext {
  const { strategies, cliName, dirs, prompts, resolveCredential, validate } = options

  /**
   * Resolve the current credential from passive sources (file, env).
   *
   * @private
   * @returns The credential, or null when none exists.
   */
  function credential(): AuthCredential | null {
    return resolveCredential()
  }

  /**
   * Check whether a credential is available from passive sources.
   *
   * @private
   * @returns True when a credential exists.
   */
  function authenticated(): boolean {
    return resolveCredential() !== null
  }

  /**
   * Run configured strategies interactively and persist the credential.
   *
   * When `loginOptions.strategies` is provided, those strategies are used
   * instead of the default configured list.
   *
   * @private
   * @param loginOptions - Optional overrides for the login attempt.
   * @returns A Result with the credential on success or an AuthError on failure.
   */
  async function login(loginOptions?: LoginOptions): ResultAsync<AuthCredential, AuthError> {
    const activeStrategies = resolveLoginStrategies(loginOptions, strategies)

    const resolved = await runStrategyChain({
      cliName,
      dirs,
      prompts,
      strategies: activeStrategies,
    })

    if (resolved === null) {
      return authError({
        message: 'No credential resolved from any source',
        type: 'no_credential',
      })
    }

    const activeValidate = resolveLoginValidate(loginOptions, validate)
    const [validationError, validatedCredential] = await runValidation(activeValidate, resolved)

    if (validationError) {
      return [validationError, null] as const
    }

    // Writes always target the global (home) directory so credentials are
    // User-scoped and never written into a project directory that could be
    // Committed. Reads (credential/file strategy) check local → global.
    const store = createStore({ dirName: dirs.global })
    const [saveError] = store.save(DEFAULT_AUTH_FILENAME, validatedCredential)

    if (saveError) {
      return authError({
        message: `Failed to save credential: ${saveError.message}`,
        type: 'save_failed',
      })
    }

    return ok(validatedCredential)
  }

  /**
   * Remove the stored credential from disk.
   *
   * @private
   * @returns A Result with the removed file path on success or an AuthError on failure.
   */
  async function logout(): ResultAsync<string, AuthError> {
    // Writes/deletes always target global. A project-local auth file is an
    // Explicit per-project override (similar to a .env) and is intentionally
    // Not removed by logout — only the user-scoped global credential is
    // Cleared. If the local file also needs removal, the CLI author should
    // Handle that explicitly in their logout command handler.
    const store = createStore({ dirName: dirs.global })
    const [removeError, filePath] = store.remove(DEFAULT_AUTH_FILENAME)

    if (removeError) {
      return authError({
        message: `Failed to remove credential: ${removeError.message}`,
        type: 'remove_failed',
      })
    }

    return ok(filePath)
  }

  return { authenticated, credential, login, logout } satisfies AuthContext
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Construct a failure Result tuple with an {@link AuthError}.
 *
 * @private
 * @param error - The auth error.
 * @returns A Result tuple `[AuthError, null]`.
 */
function authError(error: AuthError): Result<never, AuthError> {
  return [error, null] as const
}

/**
 * Resolve the active strategies for a login attempt.
 *
 * Returns the override strategies from login options when provided,
 * otherwise falls back to the configured strategies.
 *
 * @private
 * @param loginOptions - Optional login overrides.
 * @param configured - The default configured strategies.
 * @returns The strategies to use for the login attempt.
 */
function resolveLoginStrategies(
  loginOptions: LoginOptions | undefined,
  configured: readonly StrategyConfig[]
): readonly StrategyConfig[] {
  if (loginOptions !== undefined && loginOptions.strategies !== undefined) {
    return loginOptions.strategies
  }

  return configured
}

/**
 * Resolve the active validate callback for a login attempt.
 *
 * Returns the override from login options when provided,
 * otherwise falls back to the configured validate callback.
 *
 * @private
 * @param loginOptions - Optional login overrides.
 * @param configured - The default configured validate callback.
 * @returns The validate callback to use, or undefined.
 */
function resolveLoginValidate(
  loginOptions: LoginOptions | undefined,
  configured: ValidateCredential | undefined
): ValidateCredential | undefined {
  if (loginOptions !== undefined && loginOptions.validate !== undefined) {
    return loginOptions.validate
  }

  return configured
}

/**
 * Run the validate callback against a resolved credential.
 *
 * When no validate callback is provided, returns the credential as-is.
 * When validation fails, returns the error Result.
 * When validation succeeds, returns the (possibly transformed) credential.
 *
 * @private
 * @param validateFn - The validate callback, or undefined.
 * @param credential - The resolved credential to validate.
 * @returns A Result with the validated credential or an AuthError.
 */
async function runValidation(
  validateFn: ValidateCredential | undefined,
  credential: AuthCredential
): ResultAsync<AuthCredential, AuthError> {
  if (validateFn === undefined) {
    return ok(credential)
  }

  const [validationError, validatedCredential] = await validateFn(credential)

  if (validationError) {
    return authError({
      message: validationError.message,
      type: 'validation_failed',
    })
  }

  return ok(validatedCredential)
}
