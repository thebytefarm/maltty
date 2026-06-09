import { describe, expect, it } from 'vitest'

import { withContext, withFullScreen, withLayout } from './decorators.js'

function StubComponent(): null {
  return null
}

describe('story decorators', () => {
  describe('withContext()', () => {
    it('should return a decorator function', () => {
      const decorator = withContext({} as never)
      expect(typeof decorator).toBe('function')
    })

    it('should return a wrapped component when called with a component', () => {
      const decorator = withContext({} as never)
      const Wrapped = decorator(StubComponent)
      expect(typeof Wrapped).toBe('function')
    })
  })

  describe('withFullScreen()', () => {
    it('should return a decorator function', () => {
      const decorator = withFullScreen()
      expect(typeof decorator).toBe('function')
    })

    it('should return a wrapped component when called with a component', () => {
      const decorator = withFullScreen()
      const Wrapped = decorator(StubComponent)
      expect(typeof Wrapped).toBe('function')
    })
  })

  describe('withLayout()', () => {
    it('should return a decorator function', () => {
      const decorator = withLayout({ width: 80, padding: 1 })
      expect(typeof decorator).toBe('function')
    })

    it('should return a wrapped component when called with a component', () => {
      const decorator = withLayout({ width: 80 })
      const Wrapped = decorator(StubComponent)
      expect(typeof Wrapped).toBe('function')
    })
  })
})
