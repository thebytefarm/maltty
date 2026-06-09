# Testing Standards

## Overview

Testing patterns and conventions using [Vitest](https://vitest.dev). Tests live alongside source files with the `.test.ts` extension. These rules cover file organization, mocking strategies, and coverage expectations.

## Rules

### File Structure and Naming

Place test files next to the source they test. Use `.test.ts` as the extension. Name describe blocks after the module or function under test, and write test cases as "should + expected behavior."

| Element        | Convention                 | Example                                    |
| -------------- | -------------------------- | ------------------------------------------ |
| Test file      | `*.test.ts`                | `config.test.ts`                           |
| Describe block | Feature/function name      | `describe('loadConfig', ...)`              |
| Test case      | Should + expected behavior | `it('should return resolved config', ...)` |

#### Correct

```
src/
├── lib/
│   ├── config.ts
│   └── config.test.ts
├── runtime/
│   ├── executor.ts
│   └── executor.test.ts
test/
└── integration/
    └── auth-oauth-pkce.test.ts
```

### Write Clear Test Cases

Each test should have a single assertion focus. Use `async`/`await` for asynchronous code and `toMatchObject` for partial matching.

#### Correct

```ts
import { describe, it, expect } from 'vitest'
import { resolveScriptPath } from './resolver'

describe('resolveScriptPath', () => {
  it('should resolve path relative to workspace root', () => {
    const result = resolveScriptPath('build', '/project')
    expect(result).toBe('/project/scripts/build.ts')
  })

  it('should return undefined for missing scripts', () => {
    expect(resolveScriptPath('missing', '/project')).toBeUndefined()
  })
})

// Async tests
it('should load config from parent directories', async () => {
  const config = await loadConfig('/project/packages/maltty')
  expect(config).toMatchObject({
    name: expect.any(String),
  })
})
```

### Mock External Dependencies

Use `vi.mock` for module-level mocks and `vi.fn` for individual functions. Replace real I/O (file system, network) with deterministic mocks.

#### Correct

```ts
import { vi, describe, it, expect } from 'vitest'

// Mock a module
vi.mock('node:fs/promises', () => ({
  readFile: vi.fn().mockResolvedValue('{ "name": "test" }'),
  stat: vi.fn().mockResolvedValue({ isFile: () => true }),
}))

// Mock individual functions
const mockCallback = vi.fn()
mockCallback.mockReturnValue('result')
mockCallback.mockResolvedValue('async result')

// Assert calls
expect(mockCallback).toHaveBeenCalledWith('arg')
expect(mockCallback).toHaveBeenCalledTimes(1)
```

### Organize Tests by Feature

Group related tests with nested `describe` blocks. Use `beforeEach` to reset mocks and shared state before each test.

#### Correct

```ts
import { beforeEach, describe, it, vi } from 'vitest'

describe('ScriptRunner', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('execute', () => {
    it('should run the script command', () => {})
    it('should pass environment variables', () => {})
  })

  describe('resolve', () => {
    it('should find scripts in workspace root', () => {})
    it('should return error for missing scripts', () => {})
  })
})
```

### Meet Coverage Requirements

Target the following minimum coverage levels by area.

| Area                   | Minimum Coverage |
| ---------------------- | ---------------- |
| Critical path (config) | 100%             |
| Business logic         | 80%              |
| Utilities              | 70%              |

### Test Edge Cases and Error Handling

Test pure functions exhaustively, including boundary values and error paths.

#### Correct

```ts
describe('parseTimeout', () => {
  it('should parse valid number', () => {
    expect(parseTimeout('5000')).toBe(5000)
  })

  it('should return default for NaN', () => {
    expect(parseTimeout('abc')).toBe(30000)
  })

  it('should clamp negative values to zero', () => {
    expect(parseTimeout('-1')).toBe(0)
  })
})

it('should return error result for missing config', async () => {
  vi.mocked(readFile).mockRejectedValue(new Error('ENOENT'))

  const [error] = await loadConfig('/missing')
  expect(error).toMatchObject({ message: expect.stringContaining('ENOENT') })
})
```

### Avoid Testing Anti-patterns

| Don't                       | Do Instead             |
| --------------------------- | ---------------------- |
| Test implementation details | Test behavior/outcomes |
| Large test files            | Split by feature       |
| Shared mutable state        | Reset in beforeEach    |
| Skip tests without reason   | Delete or fix          |
| Test framework code         | Trust dependencies     |

## Resources

- [Vitest Documentation](https://vitest.dev)

## References

- [Functions](./functions.md) -- Pure functions and testability
- [State](./state.md) -- Immutable state patterns
