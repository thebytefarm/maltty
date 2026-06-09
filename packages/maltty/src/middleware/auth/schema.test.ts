import { describe, expectTypeOf, it } from 'vitest'
import type { z } from 'zod'

import type {
  apiKeyCredentialSchema,
  authCredentialSchema,
  basicCredentialSchema,
  bearerCredentialSchema,
  customCredentialSchema,
} from './schema.js'
import type {
  ApiKeyCredential,
  AuthCredential,
  BasicCredential,
  BearerCredential,
  CustomCredential,
} from './types.js'

describe('auth credential schema / type sync', () => {
  it('should infer BearerCredential from bearerCredentialSchema', () => {
    expectTypeOf<z.infer<typeof bearerCredentialSchema>>().toEqualTypeOf<BearerCredential>()
  })

  it('should infer BasicCredential from basicCredentialSchema', () => {
    expectTypeOf<z.infer<typeof basicCredentialSchema>>().toEqualTypeOf<BasicCredential>()
  })

  it('should infer ApiKeyCredential from apiKeyCredentialSchema', () => {
    expectTypeOf<z.infer<typeof apiKeyCredentialSchema>>().toEqualTypeOf<ApiKeyCredential>()
  })

  it('should infer CustomCredential from customCredentialSchema', () => {
    expectTypeOf<z.infer<typeof customCredentialSchema>>().toEqualTypeOf<CustomCredential>()
  })

  it('should infer AuthCredential from authCredentialSchema', () => {
    expectTypeOf<z.infer<typeof authCredentialSchema>>().toEqualTypeOf<AuthCredential>()
  })
})
