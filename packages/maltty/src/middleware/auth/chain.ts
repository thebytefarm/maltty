import { join } from 'node:path'

import { match } from 'ts-pattern'

import type { Prompts } from '@/context/types.js'
import type { ResolvedDirs } from '@/types/index.js'

import {
  DEFAULT_AUTH_FILENAME,
  DEFAULT_DEVICE_CODE_POLL_INTERVAL,
  DEFAULT_DEVICE_CODE_TIMEOUT,
  DEFAULT_OAUTH_CALLBACK_PATH,
  DEFAULT_OAUTH_PORT,
  DEFAULT_OAUTH_TIMEOUT,
} from './constants.js'
import { deriveTokenVar } from './credential.js'
import { resolveFromDeviceCode } from './strategies/device-code.js'
import { resolveFromDotenv } from './strategies/dotenv.js'
import { resolveFromEnv } from './strategies/env.js'
import { resolveFromFile } from './strategies/file.js'
import { resolveFromOAuth } from './strategies/oauth.js'
import { resolveFromToken } from './strategies/token.js'
import type { AuthCredential, StrategyConfig } from './types.js'

const DEFAULT_PROMPT_MESSAGE = 'Enter your API key'

/**
 * Chain credential strategies, returning the first non-null result.
 *
 * Walks the strategy list in order, dispatching each config to the
 * appropriate strategy function via pattern matching. Short-circuits
 * on the first successful resolution.
 *
 * @param options - Options with strategies, CLI name, and prompts instance.
 * @returns The first resolved credential, or null if all strategies fail.
 */
export async function runStrategyChain(options: {
  readonly strategies: readonly StrategyConfig[]
  readonly cliName: string
  readonly dirs: ResolvedDirs
  readonly prompts: Prompts
}): Promise<AuthCredential | null> {
  const defaultTokenVar = deriveTokenVar(options.cliName)

  return tryStrategies(options.strategies, 0, defaultTokenVar, options)
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Recursively try strategies until one returns a credential or the list is exhausted.
 *
 * @private
 * @param configs - The strategy configs.
 * @param index - The current index.
 * @param defaultTokenVar - The derived default token env var name.
 * @param context - The resolve options for prompts access.
 * @returns The first resolved credential, or null.
 */
async function tryStrategies(
  configs: readonly StrategyConfig[],
  index: number,
  defaultTokenVar: string,
  context: {
    readonly cliName: string
    readonly dirs: ResolvedDirs
    readonly prompts: Prompts
  }
): Promise<AuthCredential | null> {
  if (index >= configs.length) {
    return null
  }

  const config = configs[index]

  if (config === undefined) {
    return null
  }

  const credential = await dispatchStrategy(config, defaultTokenVar, context)

  if (credential) {
    return credential
  }

  return tryStrategies(configs, index + 1, defaultTokenVar, context)
}

/**
 * Dispatch a single strategy config to its implementation.
 *
 * @private
 * @param config - The strategy config to dispatch.
 * @param defaultTokenVar - The derived default token env var name.
 * @param context - The resolve options for prompts access.
 * @returns The resolved credential, or null.
 */
async function dispatchStrategy(
  config: StrategyConfig,
  defaultTokenVar: string,
  context: {
    readonly cliName: string
    readonly dirs: ResolvedDirs
    readonly prompts: Prompts
  }
): Promise<AuthCredential | null> {
  return match(config)
    .with({ source: 'env' }, (c): AuthCredential | null =>
      resolveFromEnv({
        tokenVar: c.tokenVar ?? defaultTokenVar,
      })
    )
    .with({ source: 'dotenv' }, (c): AuthCredential | null =>
      resolveFromDotenv({
        path: c.path ?? join(process.cwd(), '.env'),
        tokenVar: c.tokenVar ?? defaultTokenVar,
      })
    )
    .with({ source: 'file' }, (c): AuthCredential | null => {
      const fileDirName = c.dirName
      return resolveFromFile({
        filename: c.filename ?? DEFAULT_AUTH_FILENAME,
        globalDirName: fileDirName ?? context.dirs.global,
        localDirName: fileDirName ?? context.dirs.local,
      })
    })
    .with(
      { source: 'oauth' },
      (c): Promise<AuthCredential | null> =>
        resolveFromOAuth({
          authUrl: c.authUrl,
          callbackPath: c.callbackPath ?? DEFAULT_OAUTH_CALLBACK_PATH,
          clientId: c.clientId,
          port: c.port ?? DEFAULT_OAUTH_PORT,
          scopes: c.scopes ?? [],
          timeout: c.timeout ?? DEFAULT_OAUTH_TIMEOUT,
          tokenUrl: c.tokenUrl,
        })
    )
    .with(
      { source: 'device-code' },
      (c): Promise<AuthCredential | null> =>
        resolveFromDeviceCode({
          clientId: c.clientId,
          deviceAuthUrl: c.deviceAuthUrl,
          openBrowserOnStart: c.openBrowser ?? true,
          pollInterval: c.pollInterval ?? DEFAULT_DEVICE_CODE_POLL_INTERVAL,
          prompts: context.prompts,
          scopes: c.scopes ?? [],
          timeout: c.timeout ?? DEFAULT_DEVICE_CODE_TIMEOUT,
          tokenUrl: c.tokenUrl,
        })
    )
    .with(
      { source: 'token' },
      (c): Promise<AuthCredential | null> =>
        resolveFromToken({
          message: c.message ?? DEFAULT_PROMPT_MESSAGE,
          prompts: context.prompts,
        })
    )
    .with({ source: 'custom' }, (c): Promise<AuthCredential | null> | AuthCredential | null =>
      c.resolver()
    )
    .exhaustive()
}
