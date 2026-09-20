import type { z } from 'zod'

/**
 * Per-field validation error extracted from a Zod safeParse result.
 */
export interface FieldError {
  readonly field: string
  readonly message: string
}

/**
 * Validate props against a Zod schema, returning per-field errors.
 *
 * @param options - The schema and props to validate.
 * @returns An array of frozen field errors, empty when validation passes.
 */
export function validateProps({
  schema,
  props,
}: {
  readonly schema: z.ZodObject<z.ZodRawShape>
  readonly props: Record<string, unknown>
}): readonly FieldError[] {
  const result = schema.safeParse(props)
  if (result.success) {
    return []
  }
  return result.error.issues.map((issue) =>
    Object.freeze({
      field: issue.path.map(String).join('.'),
      message: issue.message,
    })
  )
}
