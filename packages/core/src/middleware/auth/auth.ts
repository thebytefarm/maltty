import { join } from 'node:path'

import { P, isNil, match } from '@maltty/utils/fp'

import { decorateContext } from '@/context/decorate.js'
import type { CommandContext } from '@/context/types.js'
import { middleware } from '@/middleware.js'
import type { DirsConfig, Middleware, ResolvedDirs } from '@/types/index.js'

import { DEFAULT_AUTH_FILENAME } from './constants.js'
import { createAuthContext } from './context.js'
import { deriveTokenVar } from './credential.js'
import { createAuthHeaders } from './headers.js'
import { createAuthRequire } from './require.js'
import type { AuthRequireOptions } from './require.js'
import { resolveFromDotenv } from './strategies/dotenv.js'
import { resolveFromEnv } from './strategies/env.js'
import { resolveFromFile } from './strategies/file.js'
import type {
  AuthCredential,
  AuthOptions,
  CustomSourceConfig,
  CustomStrategyFn,
  DeviceCodeSourceConfig,
  DeviceCodeStrategyOptions,
  DotenvSourceConfig,
  DotenvStrategyOptions,
  EnvSourceConfig,
  EnvStrategyOptions,
  FileSourceConfig,
  FileStrategyOptions,
  OAuthSourceConfig,
  OAuthStrategyOptions,
  StrategyConfig,
  TokenSourceConfig,
  TokenStrategyOptions,
} from './types.js'

/**
 * Auth factory interface — callable as a middleware factory and as a
 * namespace for strategy builder functions.
 */
export interface AuthFactory {
  (options: AuthOptions): Middleware
  readonly env: (options?: EnvStrategyOptions) => EnvSourceConfig
  readonly dotenv: (options?: DotenvStrategyOptions) => DotenvSourceConfig
  readonly file: (options?: FileStrategyOptions) => FileSourceConfig
  readonly oauth: (options: OAuthStrategyOptions) => OAuthSourceConfig
  readonly deviceCode: (options: DeviceCodeStrategyOptions) => DeviceCodeSourceConfig
  readonly token: (options?: TokenStrategyOptions) => TokenSourceConfig
  readonly apiKey: (options?: TokenStrategyOptions) => TokenSourceConfig
  readonly custom: (fn: CustomStrategyFn) => CustomSourceConfig
  readonly headers: () => (ctx: CommandContext) => Readonly<Record<string, string>>
  readonly require: (options?: AuthRequireOptions) => Middleware
}

/**
 * Create an auth middleware that decorates `ctx.auth`.
 *
 * No credential data is stored on the context. `ctx.auth.credential()`
 * resolves passively from three sources on every call:
 * 1. File — `~/.cli-name/auth.json`
 * 2. Dotenv — `.env` file (when configured)
 * 3. Env — `CLI_NAME_TOKEN`
 *
 * Interactive strategies (OAuth, device-code, token, custom) only run when the
 * command handler explicitly calls `ctx.auth.login()`.
 *
 * @param options - Auth middleware configuration.
 * @returns A Middleware that decorates ctx.auth.
 */
function createAuth(options: AuthOptions): Middleware {
  const { strategies, validate, dirs: authDirs } = options

  return middleware((ctx, next) => {
    const cliName = ctx.meta.name
    const dirs = resolveAuthDirs(ctx.meta.dirs, authDirs)
    const authContext = createAuthContext({
      cliName,
      dirs,
      prompts: ctx.prompts,
      resolveCredential: () => resolveStoredCredential(dirs, cliName, strategies),
      strategies,
      validate,
    })

    decorateContext(ctx, 'auth', authContext)
    ctx.dotdir.protect({ filename: DEFAULT_AUTH_FILENAME, location: 'global' })

    return next()
  })
}

/**
 * Auth middleware factory with strategy builder methods.
 *
 * Use as `auth({ strategies: [...] })` to create middleware, or use
 * the builder methods (`auth.env()`, `auth.oauth()`, etc.) to construct
 * strategy configs with a cleaner API.
 */
export const auth: AuthFactory = Object.assign(createAuth, {
  apiKey: buildToken,
  custom: buildCustom,
  deviceCode: buildDeviceCode,
  dotenv: buildDotenv,
  env: buildEnv,
  file: buildFile,
  headers: createAuthHeaders,
  oauth: buildOAuth,
  require: createAuthRequire,
  token: buildToken,
})

// ---------------------------------------------------------------------------
// Strategy builders
// ---------------------------------------------------------------------------

/**
 * Build an env strategy config.
 *
 * @private
 * @param options - Optional env strategy options.
 * @returns An EnvSourceConfig with `source: 'env'`.
 */
function buildEnv(options?: EnvStrategyOptions): EnvSourceConfig {
  return { ...options, source: 'env' as const }
}

/**
 * Build a dotenv strategy config.
 *
 * @private
 * @param options - Optional dotenv strategy options.
 * @returns A DotenvSourceConfig with `source: 'dotenv'`.
 */
function buildDotenv(options?: DotenvStrategyOptions): DotenvSourceConfig {
  return { ...options, source: 'dotenv' as const }
}

/**
 * Build a file strategy config.
 *
 * @private
 * @param options - Optional file strategy options.
 * @returns A FileSourceConfig with `source: 'file'`.
 */
function buildFile(options?: FileStrategyOptions): FileSourceConfig {
  return { ...options, source: 'file' as const }
}

/**
 * Build an OAuth strategy config.
 *
 * @private
 * @param options - OAuth strategy options (clientId, authUrl, tokenUrl required).
 * @returns An OAuthSourceConfig with `source: 'oauth'`.
 */
function buildOAuth(options: OAuthStrategyOptions): OAuthSourceConfig {
  return { ...options, source: 'oauth' as const }
}

/**
 * Build a device code strategy config.
 *
 * @private
 * @param options - Device code strategy options (clientId, deviceAuthUrl, tokenUrl required).
 * @returns A DeviceCodeSourceConfig with `source: 'device-code'`.
 */
function buildDeviceCode(options: DeviceCodeStrategyOptions): DeviceCodeSourceConfig {
  return { ...options, source: 'device-code' as const }
}

/**
 * Build a token strategy config.
 *
 * Prompts the user for a token interactively. Aliased as `auth.apiKey()`.
 *
 * @private
 * @param options - Optional token strategy options.
 * @returns A TokenSourceConfig with `source: 'token'`.
 */
function buildToken(options?: TokenStrategyOptions): TokenSourceConfig {
  return { ...options, source: 'token' as const }
}

/**
 * Build a custom strategy config from a strategy function.
 *
 * @private
 * @param fn - The custom strategy function.
 * @returns A CustomSourceConfig with `source: 'custom'`.
 */
function buildCustom(fn: CustomStrategyFn): CustomSourceConfig {
  return { resolver: fn, source: 'custom' as const }
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Attempt to resolve a credential from stored (non-interactive) sources.
 *
 * Checks the file store first, then dotenv, then falls back to the
 * environment variable. Scans the strategy list for `file`, `dotenv`,
 * and `env` source configs to respect user-configured overrides
 * (e.g. a custom `tokenVar`, `dirName`, or dotenv `path`).
 *
 * @private
 * @param dirs - Resolved directory names for local and global resolution.
 * @param cliName - The CLI name, used to derive env var names.
 * @param strategies - The configured strategy list for extracting overrides.
 * @returns The resolved credential, or null.
 */
function resolveStoredCredential(
  dirs: ResolvedDirs,
  cliName: string,
  strategies: readonly StrategyConfig[]
): AuthCredential | null {
  const fileConfig = findStrategyBySource(strategies, 'file')
  const dotenvConfig = findStrategyBySource(strategies, 'dotenv')
  const envConfig = findStrategyBySource(strategies, 'env')
  const defaultTokenVar = deriveTokenVar(cliName)

  const fileDirName = extractProp(fileConfig, 'dirName')
  const fromFile = resolveFromFile({
    filename: extractProp(fileConfig, 'filename') ?? DEFAULT_AUTH_FILENAME,
    globalDirName: fileDirName ?? dirs.global,
    localDirName: fileDirName ?? dirs.local,
  })

  if (fromFile) {
    return fromFile
  }

  if (dotenvConfig !== undefined) {
    const fromDotenv = resolveFromDotenv({
      path: extractProp(dotenvConfig, 'path') ?? join(process.cwd(), '.env'),
      tokenVar: extractProp(dotenvConfig, 'tokenVar') ?? defaultTokenVar,
    })

    if (fromDotenv) {
      return fromDotenv
    }
  }

  return resolveFromEnv({
    tokenVar: extractProp(envConfig, 'tokenVar') ?? defaultTokenVar,
  })
}

/**
 * Resolve the effective auth directories from meta dirs and optional override.
 *
 * When auth-level dir overrides are provided, they are merged onto the
 * meta dirs — only the fields specified in the override are replaced.
 * When no override is provided, the meta dirs are used as-is.
 *
 * @private
 * @param metaDirs - The resolved dirs from `ctx.meta.dirs`.
 * @param authDirs - Optional auth-level directory overrides.
 * @returns Resolved dirs for auth operations.
 */
function resolveAuthDirs(metaDirs: ResolvedDirs, authDirs: DirsConfig | undefined): ResolvedDirs {
  if (isNil(authDirs)) {
    return metaDirs
  }

  return {
    global: match(authDirs.global)
      .with(P.nullish, () => metaDirs.global)
      .otherwise((v) => v),
    local: match(authDirs.local)
      .with(P.nullish, () => metaDirs.local)
      .otherwise((v) => v),
  }
}

/**
 * Find the first strategy config matching a given source type.
 *
 * @private
 * @param strategies - The strategy config list.
 * @param source - The source type to find.
 * @returns The matching config, or undefined.
 */
function findStrategyBySource<TSource extends StrategyConfig['source']>(
  strategies: readonly StrategyConfig[],
  source: TSource
): Extract<StrategyConfig, { readonly source: TSource }> | undefined {
  return strategies.find(
    (r): r is Extract<StrategyConfig, { readonly source: TSource }> => r.source === source
  )
}

/**
 * Safely extract a property from an optional config object.
 *
 * Returns the property value when the config is defined, or undefined
 * when the config itself is undefined.
 *
 * @private
 * @param config - The config object, or undefined.
 * @param key - The property key to extract.
 * @returns The property value, or undefined.
 */
function extractProp<TConfig extends object, TKey extends keyof TConfig>(
  config: TConfig | undefined,
  key: TKey
): TConfig[TKey] | undefined {
  if (config === undefined) {
    return undefined
  }

  return config[key]
}
