import { attemptAsync } from '@maltty/utils/fp'

import type { HttpClient, RequestOptions, TypedResponse } from './types.js'

/**
 * Options for creating an HTTP client.
 */
interface CreateHttpClientOptions {
  readonly baseUrl: string
  readonly defaultHeaders?: Readonly<Record<string, string>>
  readonly resolveHeaders?: () => Readonly<Record<string, string>>
}

/**
 * Create a typed HTTP client with pre-configured base URL and headers.
 *
 * @param options - Client configuration.
 * @returns An HttpClient instance.
 */
export function createHttpClient(options: CreateHttpClientOptions): HttpClient {
  const { baseUrl, defaultHeaders, resolveHeaders } = options

  return {
    delete: <TResponse = unknown>(path: string, requestOptions?: RequestOptions) =>
      executeRequest<TResponse>(
        baseUrl,
        'DELETE',
        path,
        defaultHeaders,
        resolveHeaders,
        requestOptions
      ),

    get: <TResponse = unknown>(path: string, requestOptions?: RequestOptions) =>
      executeRequest<TResponse>(
        baseUrl,
        'GET',
        path,
        defaultHeaders,
        resolveHeaders,
        requestOptions
      ),

    patch: <TResponse = unknown, TBody = unknown>(
      path: string,
      requestOptions?: RequestOptions<TBody>
    ) =>
      executeRequest<TResponse>(
        baseUrl,
        'PATCH',
        path,
        defaultHeaders,
        resolveHeaders,
        requestOptions
      ),

    post: <TResponse = unknown, TBody = unknown>(
      path: string,
      requestOptions?: RequestOptions<TBody>
    ) =>
      executeRequest<TResponse>(
        baseUrl,
        'POST',
        path,
        defaultHeaders,
        resolveHeaders,
        requestOptions
      ),

    put: <TResponse = unknown, TBody = unknown>(
      path: string,
      requestOptions?: RequestOptions<TBody>
    ) =>
      executeRequest<TResponse>(
        baseUrl,
        'PUT',
        path,
        defaultHeaders,
        resolveHeaders,
        requestOptions
      ),
  } satisfies HttpClient
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Build the full URL from base, path, and optional query params.
 *
 * @private
 * @param baseUrl - The base URL.
 * @param path - The request path.
 * @param params - Optional query parameters.
 * @returns The fully qualified URL string.
 */
function buildUrl(
  baseUrl: string,
  path: string,
  params: Readonly<Record<string, string>> | undefined
): string {
  const url = new URL(path, baseUrl)

  if (params !== undefined) {
    const searchParams = new URLSearchParams(params)
    url.search = searchParams.toString()
  }

  return url.toString()
}

/**
 * Merge default, dynamic, and per-request headers into a single record.
 *
 * Per-request headers take highest priority, then dynamic headers,
 * then default headers.
 *
 * @private
 * @param defaultHeaders - Optional default headers.
 * @param dynamicHeaders - Optional dynamically resolved headers.
 * @param requestHeaders - Optional per-request headers.
 * @returns The merged headers record.
 */
function mergeHeaders(
  defaultHeaders: Readonly<Record<string, string>> | undefined,
  dynamicHeaders: Readonly<Record<string, string>> | undefined,
  requestHeaders: Readonly<Record<string, string>> | undefined
): Readonly<Record<string, string>> {
  return {
    ...defaultHeaders,
    ...dynamicHeaders,
    ...requestHeaders,
  }
}

/**
 * Normalize optional request options into a concrete object with safe defaults.
 *
 * When `options` is `undefined`, returns an empty object so callers can use
 * direct property access without additional nil checks.
 *
 * @private
 * @param options - Optional per-request options.
 * @returns The resolved options object.
 */
function resolveRequestOptions(options: RequestOptions | undefined): RequestOptions {
  if (options !== undefined) {
    return options
  }

  return {}
}

/**
 * Invoke the dynamic header resolver if provided.
 *
 * @private
 * @param resolveHeaders - Optional function to resolve dynamic headers.
 * @returns The resolved headers record, or undefined.
 */
function resolveDynamicHeaders(
  resolveHeaders: (() => Readonly<Record<string, string>>) | undefined
): Readonly<Record<string, string>> | undefined {
  if (resolveHeaders !== undefined) {
    return resolveHeaders()
  }

  return undefined
}

/**
 * Resolve the serialized body string and content-type header mutation.
 *
 * @private
 * @param options - Optional per-request options.
 * @returns The serialized body string or undefined.
 */
function resolveBody(options: RequestOptions | undefined): string | undefined {
  if (options !== undefined && options.body !== undefined) {
    return JSON.stringify(options.body)
  }

  return undefined
}

/**
 * Build the fetch init options from resolved values.
 *
 * @private
 * @param method - The HTTP method.
 * @param headers - The merged headers.
 * @param body - The serialized body or undefined.
 * @param signal - The abort signal or undefined.
 * @returns The RequestInit for fetch.
 */
function buildFetchInit(
  method: string,
  headers: Readonly<Record<string, string>>,
  body: string | undefined,
  signal: AbortSignal | undefined
): RequestInit {
  if (body !== undefined) {
    return {
      body,
      headers: { ...headers, 'Content-Type': 'application/json' },
      method,
      signal,
    }
  }

  return {
    headers,
    method,
    signal,
  }
}

/**
 * Execute an HTTP request and wrap the response.
 *
 * @private
 * @param baseUrl - The base URL.
 * @param method - The HTTP method.
 * @param path - The request path.
 * @param defaultHeaders - Optional default headers.
 * @param resolveHeaders - Optional function to resolve dynamic headers per-request.
 * @param options - Optional per-request options.
 * @returns A typed response wrapper.
 */
async function executeRequest<TResponse>(
  baseUrl: string,
  method: string,
  path: string,
  defaultHeaders: Readonly<Record<string, string>> | undefined,
  resolveHeaders: (() => Readonly<Record<string, string>>) | undefined,
  options: RequestOptions | undefined
): Promise<TypedResponse<TResponse>> {
  const resolved = resolveRequestOptions(options)
  const url = buildUrl(baseUrl, path, resolved.params)
  const dynamicHeaders = resolveDynamicHeaders(resolveHeaders)
  const headers = mergeHeaders(defaultHeaders, dynamicHeaders, resolved.headers)
  const body = resolveBody(options)
  const init = buildFetchInit(method, headers, body, resolved.signal)

  const response = await fetch(url, init)
  const data = await parseResponseBody<TResponse>(response)

  return {
    data,
    headers: response.headers,
    ok: response.ok,
    raw: response,
    status: response.status,
  }
}

/**
 * Parse the response body as JSON, returning null on failure.
 *
 * Wraps `response.json()` with `attemptAsync` so malformed API
 * responses do not crash the command. Returns `null as TResponse`
 * when parsing fails.
 *
 * @private
 * @param response - The fetch Response.
 * @returns The parsed body or null.
 */
async function parseResponseBody<TResponse>(response: Response): Promise<TResponse> {
  // Accepted exception: generic TResponse cannot be inferred from response.json().
  // The `as` casts bridge the generic HTTP client boundary. Callers provide TResponse
  // At the call site and accept the runtime type risk.
  const [error, data] = await attemptAsync(() => response.json() as Promise<TResponse>)

  if (error) {
    return null as TResponse
  }

  return data as TResponse
}
