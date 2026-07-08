import { describe, expect, it } from 'vitest'

import {
  createDefaultIcons,
  DEVOPS_ICONS,
  FILES_ICONS,
  GIT_ICONS,
  getIconsByCategory,
  STATUS_ICONS,
} from './definitions.js'

describe(createDefaultIcons, () => {
  it('should contain icons from all categories', () => {
    const icons = createDefaultIcons()
    expect(icons).toHaveProperty('branch')
    expect(icons).toHaveProperty('deploy')
    expect(icons).toHaveProperty('success')
    expect(icons).toHaveProperty('file')
  })

  it('should return a frozen record', () => {
    const icons = createDefaultIcons()
    expect(Object.isFrozen(icons)).toBeTruthy()
  })

  it('should have nerdFont and emoji fields on all icons', () => {
    const icons = createDefaultIcons()
    const entries = Object.values(icons)
    const allValid = entries.every(
      (def) => typeof def.nerdFont === 'string' && typeof def.emoji === 'string'
    )
    expect(allValid).toBeTruthy()
  })
})

describe(getIconsByCategory, () => {
  it('should return GIT_ICONS for git category', () => {
    expect(getIconsByCategory('git')).toBe(GIT_ICONS)
  })

  it('should return DEVOPS_ICONS for devops category', () => {
    expect(getIconsByCategory('devops')).toBe(DEVOPS_ICONS)
  })

  it('should return STATUS_ICONS for status category', () => {
    expect(getIconsByCategory('status')).toBe(STATUS_ICONS)
  })

  it('should return FILES_ICONS for files category', () => {
    expect(getIconsByCategory('files')).toBe(FILES_ICONS)
  })
})
