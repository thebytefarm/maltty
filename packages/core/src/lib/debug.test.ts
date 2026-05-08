import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { isDebug } from './debug.js'

const originalKidd = process.env.KIDD_DEBUG
const originalDebug = process.env.DEBUG

beforeEach(() => {
  delete process.env.KIDD_DEBUG
  delete process.env.DEBUG
})

afterEach(() => {
  if (originalKidd === undefined) {
    delete process.env.KIDD_DEBUG
  } else {
    process.env.KIDD_DEBUG = originalKidd
  }

  if (originalDebug === undefined) {
    delete process.env.DEBUG
  } else {
    process.env.DEBUG = originalDebug
  }
})

describe('isDebug()', () => {
  it('should return false when neither env var is set', () => {
    expect(isDebug()).toBeFalsy()
  })

  it('should return true when KIDD_DEBUG is "true"', () => {
    process.env.KIDD_DEBUG = 'true'
    expect(isDebug()).toBeTruthy()
  })

  it('should return true when KIDD_DEBUG is "1"', () => {
    process.env.KIDD_DEBUG = '1'
    expect(isDebug()).toBeTruthy()
  })

  it('should return false when KIDD_DEBUG is "false"', () => {
    process.env.KIDD_DEBUG = 'false'
    expect(isDebug()).toBeFalsy()
  })

  it('should return false when KIDD_DEBUG is "0"', () => {
    process.env.KIDD_DEBUG = '0'
    expect(isDebug()).toBeFalsy()
  })

  it('should return true when DEBUG is "true"', () => {
    process.env.DEBUG = 'true'
    expect(isDebug()).toBeTruthy()
  })

  it('should return true when DEBUG is "1"', () => {
    process.env.DEBUG = '1'
    expect(isDebug()).toBeTruthy()
  })

  it('should return false when DEBUG is "false"', () => {
    process.env.DEBUG = 'false'
    expect(isDebug()).toBeFalsy()
  })

  it('should prefer KIDD_DEBUG over DEBUG when both are set', () => {
    process.env.KIDD_DEBUG = 'false'
    process.env.DEBUG = 'true'
    expect(isDebug()).toBeFalsy()
  })

  it('should return false when KIDD_DEBUG is an empty string and DEBUG is unset', () => {
    process.env.KIDD_DEBUG = ''
    expect(isDebug()).toBeFalsy()
  })

  it('should return false for arbitrary truthy strings', () => {
    process.env.KIDD_DEBUG = 'yes'
    expect(isDebug()).toBeFalsy()
  })
})
