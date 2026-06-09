import type { z as Z } from 'zod'
import { z } from 'zod'

import type {
  ApiKeyCredential,
  AuthCredential,
  BasicCredential,
  BearerCredential,
  CustomCredential,
} from './types.js'

/**
 * Zod schema for bearer credentials.
 */
export const bearerCredentialSchema: Z.ZodType<BearerCredential> = z.object({
  token: z.string().min(1),
  type: z.literal('bearer'),
})

/**
 * Zod schema for basic auth credentials.
 */
export const basicCredentialSchema: Z.ZodType<BasicCredential> = z.object({
  password: z.string().min(1),
  type: z.literal('basic'),
  username: z.string().min(1),
})

/**
 * Zod schema for API key credentials.
 */
export const apiKeyCredentialSchema: Z.ZodType<ApiKeyCredential> = z.object({
  headerName: z.string().min(1),
  key: z.string().min(1),
  type: z.literal('api-key'),
})

/**
 * Zod schema for custom header credentials.
 */
export const customCredentialSchema: Z.ZodType<CustomCredential> = z.object({
  headers: z.record(z.string(), z.string()),
  type: z.literal('custom'),
})

/**
 * Zod discriminated union schema for validating auth.json credential payloads.
 * Validates against all four credential types using the `type` field as discriminator.
 */
export const authCredentialSchema: Z.ZodType<AuthCredential> = z.discriminatedUnion('type', [
  z.object({ token: z.string().min(1), type: z.literal('bearer') }),
  z.object({ password: z.string().min(1), type: z.literal('basic'), username: z.string().min(1) }),
  z.object({ headerName: z.string().min(1), key: z.string().min(1), type: z.literal('api-key') }),
  z.object({ headers: z.record(z.string(), z.string()), type: z.literal('custom') }),
])
