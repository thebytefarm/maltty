/**
 * Default filename for file-based credential storage.
 */
export const DEFAULT_AUTH_FILENAME = 'auth.json' as const

/**
 * Suffix appended to the derived token environment variable name.
 */
export const TOKEN_VAR_SUFFIX = '_TOKEN' as const

/**
 * Default port for the local OAuth callback server (`0` = ephemeral).
 */
export const DEFAULT_OAUTH_PORT = 0

/**
 * Default callback path for the local OAuth server.
 */
export const DEFAULT_OAUTH_CALLBACK_PATH = '/callback'

/**
 * Default timeout for the OAuth PKCE flow in milliseconds (2 minutes).
 */
export const DEFAULT_OAUTH_TIMEOUT = 120_000

/**
 * Default poll interval for the device code flow in milliseconds (5 seconds).
 */
export const DEFAULT_DEVICE_CODE_POLL_INTERVAL = 5000

/**
 * Default timeout for the device code flow in milliseconds (5 minutes).
 */
export const DEFAULT_DEVICE_CODE_TIMEOUT = 300_000
