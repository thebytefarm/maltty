import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock(import('node:child_process'), () => ({
  execFile: vi.fn().mockReturnValue({ on: vi.fn() }),
}))

import { createMockOAuthServer } from '@test/mock-oauth-server.js'
import type { DevicePollResponse, MockOAuthServer } from '@test/mock-oauth-server.js'

import type { Prompts } from '@/context/types.js'
import { resolveFromDeviceCode } from '@/middleware/auth/strategies/device-code.js'

const CLIENT_ID = 'device-e2e-client'

/**
 * Short interval for real-timer E2E tests (ms).
 * The mock server returns this as interval in seconds, so the resolver
 * converts it to 10ms.
 */
const SHORT_INTERVAL_SECONDS = 0.01

function createMockPrompts(): Prompts {
  return {
    text: vi.fn().mockResolvedValue(''),
  } as unknown as Prompts
}

describe('Device Code E2E (resolveFromDeviceCode with real mock server)', () => {
  let mockServer: MockOAuthServer | null = null

  afterEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()

    if (mockServer !== null) {
      mockServer.close()
      mockServer = null
    }
  })

  it('should complete full device code flow and return bearer credential', async () => {
    const pollResponses: readonly DevicePollResponse[] = [
      { type: 'pending' },
      { type: 'pending' },
      { accessToken: 'device-e2e-token', type: 'success' },
    ]

    mockServer = await createMockOAuthServer({
      clientId: CLIENT_ID,
      deviceCode: 'e2e-device-code',
      deviceInterval: SHORT_INTERVAL_SECONDS,
      devicePollResponses: pollResponses,
      userCode: 'E2E-CODE',
      verificationUri: 'https://auth.example.com/activate',
    })

    const prompts = createMockPrompts()

    const result = await resolveFromDeviceCode({
      clientId: CLIENT_ID,
      deviceAuthUrl: `${mockServer.url}/device/code`,
      pollInterval: 10,
      prompts,
      scopes: [],
      timeout: 10_000,
      tokenUrl: `${mockServer.url}/token`,
    })

    expect(result).toEqual({ token: 'device-e2e-token', type: 'bearer' })
  }, 10_000)

  it('should display verification_uri and user_code via prompts.text()', async () => {
    const pollResponses: readonly DevicePollResponse[] = [
      { accessToken: 'display-token', type: 'success' },
    ]

    mockServer = await createMockOAuthServer({
      clientId: CLIENT_ID,
      deviceCode: 'display-device-code',
      deviceInterval: SHORT_INTERVAL_SECONDS,
      devicePollResponses: pollResponses,
      userCode: 'DISP-1234',
      verificationUri: 'https://auth.example.com/verify',
    })

    const prompts = createMockPrompts()

    const result = await resolveFromDeviceCode({
      clientId: CLIENT_ID,
      deviceAuthUrl: `${mockServer.url}/device/code`,
      pollInterval: 10,
      prompts,
      scopes: [],
      timeout: 10_000,
      tokenUrl: `${mockServer.url}/token`,
    })

    expect(result).toEqual({ token: 'display-token', type: 'bearer' })

    expect(prompts.text).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('DISP-1234'),
      })
    )
    expect(prompts.text).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('https://auth.example.com/verify'),
      })
    )
  }, 10_000)

  it('should send correct grant_type in token poll requests', async () => {
    const pollResponses: readonly DevicePollResponse[] = [
      { type: 'pending' },
      { accessToken: 'grant-type-token', type: 'success' },
    ]

    mockServer = await createMockOAuthServer({
      clientId: CLIENT_ID,
      deviceCode: 'grant-device-code',
      deviceInterval: SHORT_INTERVAL_SECONDS,
      devicePollResponses: pollResponses,
    })

    const prompts = createMockPrompts()

    await resolveFromDeviceCode({
      clientId: CLIENT_ID,
      deviceAuthUrl: `${mockServer.url}/device/code`,
      pollInterval: 10,
      prompts,
      scopes: [],
      timeout: 10_000,
      tokenUrl: `${mockServer.url}/token`,
    })

    const tokenRequests = mockServer.getTokenRequests()
    expect(tokenRequests.length).toBeGreaterThanOrEqual(1)

    const allDeviceCodeGrant = tokenRequests.every(
      (req) => req.params.get('grant_type') === 'urn:ietf:params:oauth:grant-type:device_code'
    )
    expect(allDeviceCodeGrant).toBeTruthy()
  }, 10_000)

  it('should send client_id and device_code in token poll requests', async () => {
    const pollResponses: readonly DevicePollResponse[] = [
      { accessToken: 'param-token', type: 'success' },
    ]

    mockServer = await createMockOAuthServer({
      clientId: CLIENT_ID,
      deviceCode: 'param-device-code',
      deviceInterval: SHORT_INTERVAL_SECONDS,
      devicePollResponses: pollResponses,
    })

    const prompts = createMockPrompts()

    await resolveFromDeviceCode({
      clientId: CLIENT_ID,
      deviceAuthUrl: `${mockServer.url}/device/code`,
      pollInterval: 10,
      prompts,
      scopes: [],
      timeout: 10_000,
      tokenUrl: `${mockServer.url}/token`,
    })

    const tokenRequests = mockServer.getTokenRequests()
    expect(tokenRequests).toHaveLength(1)
    expect(tokenRequests[0].params.get('client_id')).toBe(CLIENT_ID)
    expect(tokenRequests[0].params.get('device_code')).toBe('param-device-code')
  }, 10_000)

  it('should return null when device auth endpoint returns error', async () => {
    mockServer = await createMockOAuthServer({
      clientId: 'wrong-client',
      deviceCode: 'error-device-code',
    })

    const prompts = createMockPrompts()

    const result = await resolveFromDeviceCode({
      clientId: CLIENT_ID,
      deviceAuthUrl: `${mockServer.url}/device/code`,
      pollInterval: 10,
      prompts,
      scopes: [],
      timeout: 10_000,
      tokenUrl: `${mockServer.url}/token`,
    })

    expect(result).toBeNull()
  })

  it('should return null when user denies access', async () => {
    const pollResponses: readonly DevicePollResponse[] = [{ type: 'denied' }]

    mockServer = await createMockOAuthServer({
      clientId: CLIENT_ID,
      deviceCode: 'denied-device-code',
      deviceInterval: SHORT_INTERVAL_SECONDS,
      devicePollResponses: pollResponses,
    })

    const prompts = createMockPrompts()

    const result = await resolveFromDeviceCode({
      clientId: CLIENT_ID,
      deviceAuthUrl: `${mockServer.url}/device/code`,
      pollInterval: 10,
      prompts,
      scopes: [],
      timeout: 10_000,
      tokenUrl: `${mockServer.url}/token`,
    })

    expect(result).toBeNull()
  }, 10_000)

  it('should return null when device code expires', async () => {
    const pollResponses: readonly DevicePollResponse[] = [{ type: 'expired' }]

    mockServer = await createMockOAuthServer({
      clientId: CLIENT_ID,
      deviceCode: 'expired-device-code',
      deviceInterval: SHORT_INTERVAL_SECONDS,
      devicePollResponses: pollResponses,
    })

    const prompts = createMockPrompts()

    const result = await resolveFromDeviceCode({
      clientId: CLIENT_ID,
      deviceAuthUrl: `${mockServer.url}/device/code`,
      pollInterval: 10,
      prompts,
      scopes: [],
      timeout: 10_000,
      tokenUrl: `${mockServer.url}/token`,
    })

    expect(result).toBeNull()
  }, 10_000)

  it('should increase poll interval on slow_down response', async () => {
    const pollResponses: readonly DevicePollResponse[] = [
      { type: 'slow_down' },
      { accessToken: 'slow-down-token', type: 'success' },
    ]

    mockServer = await createMockOAuthServer({
      clientId: CLIENT_ID,
      deviceCode: 'slow-device-code',
      deviceInterval: SHORT_INTERVAL_SECONDS,
      devicePollResponses: pollResponses,
    })

    const prompts = createMockPrompts()

    const result = await resolveFromDeviceCode({
      clientId: CLIENT_ID,
      deviceAuthUrl: `${mockServer.url}/device/code`,
      pollInterval: 10,
      prompts,
      scopes: [],
      timeout: 30_000,
      tokenUrl: `${mockServer.url}/token`,
    })

    expect(result).toEqual({ token: 'slow-down-token', type: 'bearer' })

    // Verify 2 token requests were made (slow_down + success)
    const tokenRequests = mockServer.getTokenRequests()
    expect(tokenRequests).toHaveLength(2)

    // Verify the interval actually increased: RFC 8628 adds 5000ms on slow_down.
    // The gap between the two poll requests must be >= 5000ms.
    const gap = tokenRequests[1].timestamp - tokenRequests[0].timestamp
    expect(gap).toBeGreaterThanOrEqual(4900)
  }, 30_000)

  it('should use server-provided interval over configured interval', async () => {
    const pollResponses: readonly DevicePollResponse[] = [
      { accessToken: 'interval-token', type: 'success' },
    ]

    mockServer = await createMockOAuthServer({
      clientId: CLIENT_ID,
      deviceCode: 'interval-device-code',
      deviceInterval: SHORT_INTERVAL_SECONDS,
      devicePollResponses: pollResponses,
    })

    const prompts = createMockPrompts()

    const result = await resolveFromDeviceCode({
      clientId: CLIENT_ID,
      deviceAuthUrl: `${mockServer.url}/device/code`,
      pollInterval: 60_000,
      prompts,
      scopes: [],
      timeout: 10_000,
      tokenUrl: `${mockServer.url}/token`,
    })

    // If the resolver used the configured pollInterval (60s), this would time out.
    // Server returns interval: 0.01 (10ms), so polling completes quickly.
    expect(result).toEqual({ token: 'interval-token', type: 'bearer' })
  }, 10_000)

  it('should return null on overall timeout', async () => {
    const pollResponses: readonly DevicePollResponse[] = [
      { type: 'pending' },
      { type: 'pending' },
      { type: 'pending' },
      { type: 'pending' },
      { type: 'pending' },
      { type: 'pending' },
      { type: 'pending' },
      { type: 'pending' },
      { type: 'pending' },
      { type: 'pending' },
      { type: 'pending' },
      { type: 'pending' },
      { type: 'pending' },
      { type: 'pending' },
      { type: 'pending' },
    ]

    mockServer = await createMockOAuthServer({
      clientId: CLIENT_ID,
      deviceCode: 'timeout-device-code',
      deviceInterval: SHORT_INTERVAL_SECONDS,
      devicePollResponses: pollResponses,
    })

    const prompts = createMockPrompts()

    const result = await resolveFromDeviceCode({
      clientId: CLIENT_ID,
      deviceAuthUrl: `${mockServer.url}/device/code`,
      pollInterval: 10,
      prompts,
      scopes: [],
      timeout: 3000,
      tokenUrl: `${mockServer.url}/token`,
    })

    expect(result).toBeNull()

    // Verify that polling actually started (at least one token request was made).
    // Server interval is clamped to a 1s minimum, so timeout must exceed 1s.
    const tokenRequests = mockServer.getTokenRequests()
    expect(tokenRequests.length).toBeGreaterThanOrEqual(1)
  }, 10_000)

  it('should include scopes in device auth request body', async () => {
    const pollResponses: readonly DevicePollResponse[] = [
      { accessToken: 'scope-token', type: 'success' },
    ]

    mockServer = await createMockOAuthServer({
      clientId: CLIENT_ID,
      deviceCode: 'scope-device-code',
      deviceInterval: SHORT_INTERVAL_SECONDS,
      devicePollResponses: pollResponses,
    })

    const prompts = createMockPrompts()

    await resolveFromDeviceCode({
      clientId: CLIENT_ID,
      deviceAuthUrl: `${mockServer.url}/device/code`,
      pollInterval: 10,
      prompts,
      scopes: ['openid', 'profile', 'email'],
      timeout: 10_000,
      tokenUrl: `${mockServer.url}/token`,
    })

    const deviceAuthRequests = mockServer.getDeviceAuthRequests()
    expect(deviceAuthRequests).toHaveLength(1)
    expect(deviceAuthRequests[0].params.get('scope')).toBe('openid profile email')
    expect(deviceAuthRequests[0].params.get('client_id')).toBe(CLIENT_ID)
  }, 10_000)
})
