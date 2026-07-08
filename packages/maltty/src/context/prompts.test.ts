import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock(import('@clack/prompts'), () => ({
  confirm: vi.fn(),
  multiselect: vi.fn(),
  password: vi.fn(),
  select: vi.fn(),
  text: vi.fn(),
  autocomplete: vi.fn(),
  autocompleteMultiselect: vi.fn(),
  groupMultiselect: vi.fn(),
  selectKey: vi.fn(),
  path: vi.fn(),
  group: vi.fn(),
  cancel: vi.fn(),
  isCancel: vi.fn(),
}))

import * as clack from '@clack/prompts'

import { isContextError } from './error.js'
import { createContextPrompts } from './prompts.js'

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(clack.isCancel).mockReturnValue(false)
})

describe('createContextPrompts()', () => {
  describe('confirm()', () => {
    it('should return the resolved value from clack', async () => {
      vi.mocked(clack.confirm).mockResolvedValue(true)
      const prompts = createContextPrompts()
      const result = await prompts.confirm({ message: 'Continue?' })
      expect(result).toBeTruthy()
    })

    it('should throw ContextError when user cancels', async () => {
      vi.mocked(clack.confirm).mockResolvedValue(Symbol('cancel') as never)
      vi.mocked(clack.isCancel).mockReturnValue(true)
      const prompts = createContextPrompts()
      await expect(prompts.confirm({ message: 'Continue?' })).rejects.toSatisfy(isContextError)
    })
  })

  describe('text()', () => {
    it('should return the resolved string from clack', async () => {
      vi.mocked(clack.text).mockResolvedValue('hello')
      const prompts = createContextPrompts()
      const result = await prompts.text({ message: 'Enter text:' })
      expect(result).toBe('hello')
    })

    it('should throw ContextError when user cancels', async () => {
      vi.mocked(clack.text).mockResolvedValue(Symbol('cancel') as never)
      vi.mocked(clack.isCancel).mockReturnValue(true)
      const prompts = createContextPrompts()
      await expect(prompts.text({ message: 'Enter text:' })).rejects.toSatisfy(isContextError)
    })
  })

  describe('select()', () => {
    it('should return the resolved value from clack', async () => {
      vi.mocked(clack.select).mockResolvedValue('option-a')
      const prompts = createContextPrompts()
      const result = await prompts.select({
        message: 'Pick one:',
        options: [{ value: 'option-a', label: 'Option A' }],
      })
      expect(result).toBe('option-a')
    })
  })

  describe('password()', () => {
    it('should return the resolved value from clack', async () => {
      vi.mocked(clack.password).mockResolvedValue('secret')
      const prompts = createContextPrompts()
      const result = await prompts.password({ message: 'Enter password:' })
      expect(result).toBe('secret')
    })
  })

  describe('multiselect()', () => {
    it('should return the resolved values from clack', async () => {
      vi.mocked(clack.multiselect).mockResolvedValue(['a', 'b'])
      const prompts = createContextPrompts()
      const result = await prompts.multiselect({
        message: 'Pick many:',
        options: [
          { value: 'a', label: 'A' },
          { value: 'b', label: 'B' },
        ],
      })
      expect(result).toEqual(['a', 'b'])
    })
  })

  describe('autocomplete()', () => {
    it('should return the resolved value from clack', async () => {
      vi.mocked(clack.autocomplete).mockResolvedValue('match')
      const prompts = createContextPrompts()
      const result = await prompts.autocomplete({
        message: 'Search:',
        options: [{ value: 'match', label: 'Match' }],
      })
      expect(result).toBe('match')
    })
  })

  describe('autocompleteMultiselect()', () => {
    it('should return the resolved values from clack', async () => {
      vi.mocked(clack.autocompleteMultiselect).mockResolvedValue(['x', 'y'])
      const prompts = createContextPrompts()
      const result = await prompts.autocompleteMultiselect({
        message: 'Search many:',
        options: [
          { value: 'x', label: 'X' },
          { value: 'y', label: 'Y' },
        ],
      })
      expect(result).toEqual(['x', 'y'])
    })
  })

  describe('groupMultiselect()', () => {
    it('should return the resolved values from clack', async () => {
      vi.mocked(clack.groupMultiselect).mockResolvedValue(['g1'])
      const prompts = createContextPrompts()
      const result = await prompts.groupMultiselect({
        message: 'Pick from groups:',
        options: { group1: [{ value: 'g1', label: 'G1' }] },
      })
      expect(result).toEqual(['g1'])
    })
  })

  describe('selectKey()', () => {
    it('should return the resolved value from clack', async () => {
      vi.mocked(clack.selectKey).mockResolvedValue('y')
      const prompts = createContextPrompts()
      const result = await prompts.selectKey({
        message: 'Press a key:',
        options: [{ value: 'y', label: 'Yes' }],
      })
      expect(result).toBe('y')
    })
  })

  describe('path()', () => {
    it('should return the resolved value from clack', async () => {
      vi.mocked(clack.path).mockResolvedValue('/home/user/file.txt')
      const prompts = createContextPrompts()
      const result = await prompts.path({ message: 'Select path:' })
      expect(result).toBe('/home/user/file.txt')
    })
  })

  describe('group()', () => {
    it('should return the resolved group results from clack', async () => {
      const groupResult = { name: 'Alice', age: 30 }
      vi.mocked(clack.group).mockResolvedValue(groupResult)
      const prompts = createContextPrompts()
      const result = await prompts.group({
        name: async () => 'Alice',
        age: async () => 30,
      })
      expect(result).toEqual(groupResult)
    })
  })

  describe('defaults', () => {
    it('should spread defaults into clack calls', async () => {
      vi.mocked(clack.confirm).mockResolvedValue(true)
      const prompts = createContextPrompts({ defaults: { guide: true } })
      await prompts.confirm({ message: 'Continue?' })
      expect(clack.confirm).toHaveBeenCalledWith(
        expect.objectContaining({ withGuide: true, message: 'Continue?' })
      )
    })
  })
})
