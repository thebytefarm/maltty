import type { ResultAsync } from '@maltty/utils/fp'

import type { DirsConfig } from '@/types/index.js'

// ---------------------------------------------------------------------------
// Auth credentials
// ---------------------------------------------------------------------------

/**
 * Bearer token credential — sends `Authorization: Bearer <token>`.
 */
export interface BearerCredential {
  readonly type: 'bearer'
  readonly token: string
}

/**
 * Basic auth credential — sends `Authorization: Basic base64(user:pass)`.
 */
export interface BasicCredential {
  readonly type: 'basic'
  readonly username: string
  readonly password: string
}

/**
 * API key credential — sends the key in a custom header.
 */
export interface ApiKeyCredential {
  readonly type: 'api-key'
  readonly headerName: string
  readonly key: string
}

/**
 * Custom credential — sends arbitrary headers.
 */
export interface CustomCredential {
  readonly type: 'custom'
  readonly headers: Readonly<Record<string, string>>
}

/**
 * Discriminated union of all supported auth credential formats.
 * The `type` field acts as the discriminator.
 */
export type AuthCredential =
  | BearerCredential
  | BasicCredential
  | ApiKeyCredential
  | CustomCredential

// ---------------------------------------------------------------------------
// Strategy configs
// ---------------------------------------------------------------------------

/**
 * Resolve credentials from environment variables.
 */
export interface EnvSourceConfig {
  readonly source: 'env'
  readonly tokenVar?: string
}

/**
 * Resolve credentials from a `.env` file parsed with dotenv.
 */
export interface DotenvSourceConfig {
  readonly source: 'dotenv'
  readonly tokenVar?: string
  readonly path?: string
}

/**
 * Resolve credentials from a JSON file on disk.
 */
export interface FileSourceConfig {
  readonly source: 'file'
  readonly filename?: string
  readonly dirName?: string
}

/**
 * Resolve credentials via OAuth 2.0 Authorization Code + PKCE (RFC 7636 + RFC 8252).
 *
 * Opens the user's browser to the authorization URL, receives an auth code
 * via GET redirect to a local server, and exchanges it at the token endpoint
 * with a PKCE code verifier.
 */
export interface OAuthSourceConfig {
  readonly source: 'oauth'
  readonly clientId: string
  readonly authUrl: string
  readonly tokenUrl: string
  readonly scopes?: readonly string[]
  readonly port?: number
  readonly callbackPath?: string
  readonly timeout?: number
}

/**
 * Resolve credentials via OAuth 2.0 Device Authorization Grant (RFC 8628).
 *
 * Requests a device code from the authorization server, displays a
 * verification URL and user code, and polls the token endpoint until
 * the user completes authorization.
 */
export interface DeviceCodeSourceConfig {
  readonly source: 'device-code'
  readonly clientId: string
  readonly deviceAuthUrl: string
  readonly tokenUrl: string
  readonly scopes?: readonly string[]
  readonly pollInterval?: number
  readonly timeout?: number
  readonly openBrowser?: boolean
}

/**
 * Resolve credentials by prompting the user interactively.
 */
export interface TokenSourceConfig {
  readonly source: 'token'
  readonly message?: string
}

/**
 * Resolve credentials via a user-supplied function.
 */
export interface CustomSourceConfig {
  readonly source: 'custom'
  readonly resolver: () => Promise<AuthCredential | null> | AuthCredential | null
}

/**
 * Discriminated union of all supported credential source configurations.
 * The `source` field acts as the discriminator.
 */
export type StrategyConfig =
  | EnvSourceConfig
  | DotenvSourceConfig
  | FileSourceConfig
  | OAuthSourceConfig
  | DeviceCodeSourceConfig
  | TokenSourceConfig
  | CustomSourceConfig

// ---------------------------------------------------------------------------
// Validate credential
// ---------------------------------------------------------------------------

/**
 * Callback that validates a resolved credential before it is persisted.
 *
 * Returning a successful Result allows the credential to be saved (the
 * returned credential is what gets persisted, so the callback may also
 * enrich or transform it). Returning a failure Result prevents persistence
 * and surfaces the error to the caller.
 */
export type ValidateCredential = (
  credential: AuthCredential
) => ResultAsync<AuthCredential, AuthError>

// ---------------------------------------------------------------------------
// Auth error
// ---------------------------------------------------------------------------

/**
 * Error returned by {@link AuthContext.login} or {@link AuthContext.logout}
 * when the operation fails.
 */
export interface AuthError {
  readonly type: 'no_credential' | 'save_failed' | 'remove_failed' | 'validation_failed'
  readonly message: string
}

// ---------------------------------------------------------------------------
// Login options
// ---------------------------------------------------------------------------

/**
 * Options accepted by {@link AuthContext.login} to override the default
 * strategy list for a single login attempt.
 */
export interface LoginOptions {
  readonly strategies?: readonly StrategyConfig[]
  readonly validate?: ValidateCredential
}

// ---------------------------------------------------------------------------
// Auth context
// ---------------------------------------------------------------------------

/**
 * Auth context decorated onto `ctx.auth` by the auth middleware.
 *
 * No credential data is stored directly on the context. Instead, callers
 * use `credential()` to read saved credentials on demand and
 * `authenticated()` to check whether a credential exists without exposing it.
 *
 * `login()` runs the configured interactive strategies (OAuth, prompt,
 * etc.), persists the resulting credential to disk, and returns a
 * {@link ResultAsync}.
 *
 * `logout()` removes the stored credential from disk.
 */
export interface AuthContext {
  readonly credential: () => AuthCredential | null
  readonly authenticated: () => boolean
  readonly login: (options?: LoginOptions) => ResultAsync<AuthCredential, AuthError>
  readonly logout: () => ResultAsync<string, AuthError>
}

// ---------------------------------------------------------------------------
// Strategy builder option types
// ---------------------------------------------------------------------------

/**
 * Options for the `auth.env()` builder. Omits the `source` discriminator.
 */
export type EnvStrategyOptions = Omit<EnvSourceConfig, 'source'>

/**
 * Options for the `auth.dotenv()` builder. Omits the `source` discriminator.
 */
export type DotenvStrategyOptions = Omit<DotenvSourceConfig, 'source'>

/**
 * Options for the `auth.file()` builder. Omits the `source` discriminator.
 */
export type FileStrategyOptions = Omit<FileSourceConfig, 'source'>

/**
 * Options for the `auth.oauth()` builder. Omits the `source` discriminator.
 */
export type OAuthStrategyOptions = Omit<OAuthSourceConfig, 'source'>

/**
 * Options for the `auth.deviceCode()` builder. Omits the `source` discriminator.
 */
export type DeviceCodeStrategyOptions = Omit<DeviceCodeSourceConfig, 'source'>

/**
 * Options for the `auth.token()` builder. Omits the `source` discriminator.
 */
export type TokenStrategyOptions = Omit<TokenSourceConfig, 'source'>

/**
 * Function signature accepted by `auth.custom()`.
 */
export type CustomStrategyFn = () => Promise<AuthCredential | null> | AuthCredential | null

// ---------------------------------------------------------------------------
// Auth options
// ---------------------------------------------------------------------------

/**
 * Options accepted by the `auth()` middleware factory.
 *
 * @property strategies - Ordered list of credential sources to try via `login()`.
 * @property validate - Optional callback to validate a credential before persisting.
 * @property dirs - Override directory names for auth file storage. Partially overrides
 *   `ctx.meta.dirs` — only the fields you specify are replaced.
 */
export interface AuthOptions {
  readonly strategies: readonly StrategyConfig[]
  readonly validate?: ValidateCredential
  readonly dirs?: DirsConfig
}

// ---------------------------------------------------------------------------
// Module augmentation
// ---------------------------------------------------------------------------

/**
 * Augments the base {@link CommandContext} with an optional `auth` property.
 *
 * When a consumer imports `maltty/auth`, this declaration merges `auth`
 * onto `CommandContext` so that `ctx.auth` is typed without manual casting.
 */
declare module '@maltty/core' {
  interface CommandContext {
    readonly auth: AuthContext
  }
}
