import type { CommandContext } from '@/context/types.js'

// ---------------------------------------------------------------------------
// Response
// ---------------------------------------------------------------------------

/**
 * Typed response wrapper returned by all client methods.
 *
 * @typeParam TData - The parsed JSON body type.
 */
export interface TypedResponse<TData> {
  readonly data: TData
  readonly status: number
  readonly headers: Headers
  readonly ok: boolean
  readonly raw: Response
}

// ---------------------------------------------------------------------------
// Request
// ---------------------------------------------------------------------------

/**
 * Options for individual HTTP requests.
 *
 * @typeParam TBody - Constrains the body type for methods that accept a body.
 */
export interface RequestOptions<TBody = unknown> {
  readonly body?: TBody
  readonly headers?: Readonly<Record<string, string>>
  readonly params?: Readonly<Record<string, string>>
  readonly signal?: AbortSignal
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

/**
 * Typed HTTP client with method-level generics for response and body types.
 */
export interface HttpClient {
  get<TResponse = unknown>(
    path: string,
    options?: RequestOptions
  ): Promise<TypedResponse<TResponse>>

  post<TResponse = unknown, TBody = unknown>(
    path: string,
    options?: RequestOptions<TBody>
  ): Promise<TypedResponse<TResponse>>

  put<TResponse = unknown, TBody = unknown>(
    path: string,
    options?: RequestOptions<TBody>
  ): Promise<TypedResponse<TResponse>>

  patch<TResponse = unknown, TBody = unknown>(
    path: string,
    options?: RequestOptions<TBody>
  ): Promise<TypedResponse<TResponse>>

  delete<TResponse = unknown>(
    path: string,
    options?: RequestOptions
  ): Promise<TypedResponse<TResponse>>
}

// ---------------------------------------------------------------------------
// Middleware options
// ---------------------------------------------------------------------------

/**
 * Options for the {@link http} middleware factory.
 *
 * The standalone `http()` middleware does not read from `ctx.auth`.
 * Use `auth({ http: { ... } })` for automatic credential injection,
 * or pass headers directly via the `headers` option.
 */
export interface HttpOptions {
  readonly namespace: string
  readonly baseUrl: string
  readonly headers?:
    | Readonly<Record<string, string>>
    | ((
        ctx: CommandContext
      ) => Readonly<Record<string, string>> | Promise<Readonly<Record<string, string>>>)
}
