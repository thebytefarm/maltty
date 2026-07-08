import { match } from 'ts-pattern'

import type { IconCategory, IconDefinition } from './types.js'

// ---------------------------------------------------------------------------
// Category constants
// ---------------------------------------------------------------------------

/**
 * Git-related icons for version control operations.
 *
 * Emoji values use Unicode escape sequences rather than literal emoji
 * characters to avoid encoding issues across editors, terminals, and
 * build tools that may not handle multi-byte characters correctly.
 *
 * Nerd Font sources: nf-dev (Devicons), nf-fa (Font Awesome)
 */
export const GIT_ICONS: Readonly<Record<string, IconDefinition>> = Object.freeze({
  branch: { emoji: '\u{1F500}', nerdFont: '\uE725' },
  clone: { emoji: '\u{1F4CB}', nerdFont: '\uF24D' },
  commit: { emoji: '\u{1F4DD}', nerdFont: '\uE729' },
  compare: { emoji: '\u{1F504}', nerdFont: '\uE728' },
  fetch: { emoji: '\u{2B07}\uFE0F', nerdFont: '\uEC1D' },
  fork: { emoji: '\u{1F500}', nerdFont: '\uF126' },
  git: { emoji: '\u{1F4BB}', nerdFont: '\uE702' },
  merge: { emoji: '\u{1F500}', nerdFont: '\uE727' },
  pr: { emoji: '\u{1F4E5}', nerdFont: '\uE726' },
  tag: { emoji: '\u{1F3F7}\uFE0F', nerdFont: '\uF02B' },
  worktree: { emoji: '\u{1F333}', nerdFont: '\uEF81' },
})

/**
 * DevOps and infrastructure icons.
 *
 * Nerd Font sources: nf-dev (Devicons), nf-fa (Font Awesome)
 */
export const DEVOPS_ICONS: Readonly<Record<string, IconDefinition>> = Object.freeze({
  ci: { emoji: '\u{2699}\uFE0F', nerdFont: '\uF013' },
  cloud: { emoji: '\u{2601}\uFE0F', nerdFont: '\uF0C2' },
  deploy: { emoji: '\u{1F680}', nerdFont: '\uF135' },
  docker: { emoji: '\u{1F433}', nerdFont: '\uF21F' },
  kubernetes: { emoji: '\u{2638}\uFE0F', nerdFont: '\uE81D' },
  server: { emoji: '\u{1F5A5}\uFE0F', nerdFont: '\uF233' },
  terminal: { emoji: '\u{1F4BB}', nerdFont: '\uF120' },
})

/**
 * Status indicator icons.
 *
 * Nerd Font sources: nf-fa (Font Awesome)
 */
export const STATUS_ICONS: Readonly<Record<string, IconDefinition>> = Object.freeze({
  error: { emoji: '\u{274C}', nerdFont: '\uF05C' },
  info: { emoji: '\u{2139}\uFE0F', nerdFont: '\uF129' },
  pending: { emoji: '\u{23F3}', nerdFont: '\uF254' },
  running: { emoji: '\u{25B6}\uFE0F', nerdFont: '\uF04B' },
  stopped: { emoji: '\u{23F9}\uFE0F', nerdFont: '\uF28D' },
  success: { emoji: '\u{2705}', nerdFont: '\uF05D' },
  warning: { emoji: '\u{26A0}\uFE0F', nerdFont: '\uF071' },
})

/**
 * File type and filesystem icons.
 *
 * Nerd Font sources: nf-fa (Font Awesome), nf-dev (Devicons)
 */
export const FILES_ICONS: Readonly<Record<string, IconDefinition>> = Object.freeze({
  config: { emoji: '\u{2699}\uFE0F', nerdFont: '\uF013' },
  file: { emoji: '\u{1F4C4}', nerdFont: '\uF15B' },
  folder: { emoji: '\u{1F4C1}', nerdFont: '\uF07B' },
  javascript: { emoji: '\u{1F4C4}', nerdFont: '\uE781' },
  json: { emoji: '\u{1F4C4}', nerdFont: '\uE80B' },
  lock: { emoji: '\u{1F512}', nerdFont: '\uF023' },
  markdown: { emoji: '\u{1F4C4}', nerdFont: '\uE73E' },
  typescript: { emoji: '\u{1F4C4}', nerdFont: '\uE8CA' },
})

// ---------------------------------------------------------------------------
// Exported helpers
// ---------------------------------------------------------------------------

/**
 * Merge all category icon records into a single definitions record.
 *
 * @returns A frozen record of all predefined icons.
 */
export function createDefaultIcons(): Readonly<Record<string, IconDefinition>> {
  return Object.freeze({
    ...GIT_ICONS,
    ...DEVOPS_ICONS,
    ...STATUS_ICONS,
    ...FILES_ICONS,
  })
}

/**
 * Retrieve the icon definitions for a specific category.
 *
 * @param category - The icon category to retrieve.
 * @returns The frozen record of icons for that category.
 */
export function getIconsByCategory(
  category: IconCategory
): Readonly<Record<string, IconDefinition>> {
  return match(category)
    .with('git', () => GIT_ICONS)
    .with('devops', () => DEVOPS_ICONS)
    .with('status', () => STATUS_ICONS)
    .with('files', () => FILES_ICONS)
    .exhaustive()
}
