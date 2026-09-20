// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Options for removing a character from a string.
 */
export interface RemoveCharAtOptions {
  readonly str: string
  readonly index: number
}

/**
 * Options for inserting characters into a string.
 */
export interface InsertCharAtOptions {
  readonly str: string
  readonly index: number
  readonly chars: string
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * Remove a character at the given position in a string.
 *
 * @param opts - The removal options.
 * @returns The string with the character removed.
 */
export function removeCharAt({ str, index }: RemoveCharAtOptions): string {
  return str.slice(0, index) + str.slice(index + 1)
}

/**
 * Insert a character sequence at the given position in a string.
 *
 * @param opts - The insertion options.
 * @returns The string with the characters inserted.
 */
export function insertCharAt({ str, index, chars }: InsertCharAtOptions): string {
  return str.slice(0, index) + chars + str.slice(index)
}
