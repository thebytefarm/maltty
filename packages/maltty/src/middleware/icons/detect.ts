import { listSystemFonts } from './list-system-fonts.js'

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Detect whether Nerd Fonts are installed on the system.
 *
 * Scans platform font directories for font files whose path contains
 * "Nerd" (case-insensitive). Returns `false` when directory scanning fails.
 *
 * @returns A promise that resolves to true when at least one Nerd Font is found.
 */
export async function detectNerdFonts(): Promise<boolean> {
  const [error, fonts] = await listSystemFonts()

  if (error) {
    return false
  }

  return fonts.some((font) => /nerd/i.test(font))
}
