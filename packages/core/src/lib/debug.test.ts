import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { isDebug } from './debug.js'

const originalMaltty = process.env.MALTTY_DEBUG
const originalDebug = process.env.DEBUG

beforeEach(() => {
  delete process.env.MALTTY_DEBUG
  delete process.env.DEBUG
})

afterEach(() => {
  if (originalMaltty === undefined) {
    delete process.env.MALTTY_DEBUG
  } else {
    process.env.MALTTY_DEBUG = originalMaltty
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

  it('should return true when MALTTY_DEBUG is "true"', () => {
    process.env.MALTTY_DEBUG = 'true'
    expect(isDebug()).toBeTruthy()
  })

  it('should return true when MALTTY_DEBUG is "1"', () => {
    process.env.MALTTY_DEBUG = '1'
    expect(isDebug()).toBeTruthy()
  })

  it('should return false when MALTTY_DEBUG is "false"', () => {
    process.env.MALTTY_DEBUG = 'false'
    expect(isDebug()).toBeFalsy()
  })

  it('should return false when MALTTY_DEBUG is "0"', () => {
    process.env.MALTTY_DEBUG = '0'
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

  it('should prefer MALTTY_DEBUG over DEBUG when both are set', () => {
    process.env.MALTTY_DEBUG = 'false'
    process.env.DEBUG = 'true'
    expect(isDebug()).toBeFalsy()
  })

  it('should return false when MALTTY_DEBUG is an empty string and DEBUG is unset', () => {
    process.env.MALTTY_DEBUG = ''
    expect(isDebug()).toBeFalsy()
  })

  it('should return false for arbitrary truthy strings', () => {
    process.env.MALTTY_DEBUG = 'yes'
    expect(isDebug()).toBeFalsy()
  })
})
