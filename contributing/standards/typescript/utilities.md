# Utilities (es-toolkit)

## Overview

Check [es-toolkit](https://es-toolkit.sh) before writing any utility function. It likely already exists with better edge-case handling, tree-shaking, and type safety. These rules cover which es-toolkit functions to reach for and when to write your own instead.

## Rules

### Use Type Guards for Runtime Checks

Functions for runtime type checking. Prefer these over manual `typeof` chains.

| Function        | Description             | Example                |
| --------------- | ----------------------- | ---------------------- |
| `isNil`         | Check null or undefined | `isNil(value)`         |
| `isNull`        | Check null only         | `isNull(value)`        |
| `isUndefined`   | Check undefined only    | `isUndefined(value)`   |
| `isString`      | Check string            | `isString(value)`      |
| `isNumber`      | Check number (not NaN)  | `isNumber(value)`      |
| `isBoolean`     | Check boolean           | `isBoolean(value)`     |
| `isPlainObject` | Check plain object      | `isPlainObject(value)` |
| `isArray`       | Check array             | `isArray(value)`       |
| `isFunction`    | Check function          | `isFunction(value)`    |

#### Correct

```ts
import { isNil, isPlainObject, isString } from 'es-toolkit'

// Filter out nil values
if (!isNil(value)) {
  // value is not null or undefined
}

// Validate payload structure
if (isPlainObject(payload) && isString(payload.action)) {
  // payload is a plain object with string action
}
```

### Use Object Utilities for Immutable Transforms

Functions for picking, omitting, and transforming object properties without mutation.

| Function    | Description          | Example                 |
| ----------- | -------------------- | ----------------------- |
| `pick`      | Select properties    | `pick(obj, ['a', 'b'])` |
| `omit`      | Exclude properties   | `omit(obj, ['secret'])` |
| `omitBy`    | Exclude by predicate | `omitBy(obj, isNil)`    |
| `pickBy`    | Select by predicate  | `pickBy(obj, isString)` |
| `mapValues` | Transform values     | `mapValues(obj, fn)`    |
| `mapKeys`   | Transform keys       | `mapKeys(obj, fn)`      |
| `merge`     | Deep merge objects   | `merge(target, source)` |
| `clone`     | Shallow clone        | `clone(obj)`            |
| `cloneDeep` | Deep clone           | `cloneDeep(obj)`        |

#### Correct

```ts
import { pick, omit, omitBy, isNil } from 'es-toolkit'

// Select specific fields for display
const summary = pick(config, ['name', 'root', 'scripts'])

// Remove internal fields before serializing
const safeConfig = omit(config, ['_resolved', '_path'])

// Remove nil values before writing config
const cleanConfig = omitBy(rawConfig, isNil)
```

### Use Collection Utilities for Arrays

Functions for grouping, deduplicating, and batching arrays.

| Function       | Description               | Example                         |
| -------------- | ------------------------- | ------------------------------- |
| `groupBy`      | Group by key/function     | `groupBy(scripts, 'workspace')` |
| `keyBy`        | Create lookup by key      | `keyBy(scripts, 'name')`        |
| `chunk`        | Split into chunks         | `chunk(items, 10)`              |
| `uniq`         | Remove duplicates         | `uniq(array)`                   |
| `uniqBy`       | Remove duplicates by key  | `uniqBy(scripts, 'name')`       |
| `difference`   | Items in first not second | `difference(a, b)`              |
| `intersection` | Items in both             | `intersection(a, b)`            |
| `compact`      | Remove falsy values       | `compact(array)`                |
| `flatten`      | Flatten one level         | `flatten(nested)`               |
| `flattenDeep`  | Flatten all levels        | `flattenDeep(nested)`           |

#### Correct

```ts
import { groupBy, keyBy, chunk, uniqBy } from 'es-toolkit'

// Group scripts by workspace
const scriptsByWorkspace = groupBy(scripts, 'workspace')
// { root: [...], packages/maltty: [...] }

// Create name lookup
const scriptsByName = keyBy(scripts, 'name')
// { build: script1, lint: script2 }

// Process workspaces in batches
const batches = chunk(workspaces, 10)
await batches.reduce((chain, batch) => chain.then(() => processBatch(batch)), Promise.resolve())

// Remove duplicate script names
const uniqueScripts = uniqBy(scripts, 'name')
```

### Use Function Utilities for Scheduling and Caching

Functions for controlling execution timing and caching results.

| Function   | Description          | Example              |
| ---------- | -------------------- | -------------------- |
| `debounce` | Delay until pause    | `debounce(fn, 300)`  |
| `throttle` | Limit call frequency | `throttle(fn, 1000)` |
| `memoize`  | Cache results        | `memoize(fn)`        |
| `once`     | Call only once       | `once(fn)`           |
| `noop`     | No-op function       | `noop`               |
| `identity` | Return input         | `identity`           |

#### Correct

```ts
import { debounce, throttle, memoize } from 'es-toolkit'

// Debounce file watcher callback to avoid redundant rebuilds
const onFileChange = debounce((path: string) => {
  rebuildWorkspace(path)
}, 300)

// Throttle log output to at most once per second
const logProgress = throttle((message: string) => {
  process.stdout.write(`\r${message}`)
}, 1000)

// Cache expensive config resolution
const resolveConfig = memoize((root: string) => {
  return loadAndMergeConfig(root)
})
```

### Use String Utilities for Case Conversion

Functions for converting between naming conventions.

| Function     | Description            | Example                |
| ------------ | ---------------------- | ---------------------- |
| `camelCase`  | Convert to camelCase   | `camelCase('foo-bar')` |
| `kebabCase`  | Convert to kebab-case  | `kebabCase('fooBar')`  |
| `snakeCase`  | Convert to snake_case  | `snakeCase('fooBar')`  |
| `capitalize` | Uppercase first letter | `capitalize('hello')`  |
| `trim`       | Remove whitespace      | `trim(' hello ')`      |

#### Correct

```ts
import { camelCase, kebabCase } from 'es-toolkit'

// Convert config keys from snake_case
const configKey = 'script_timeout'
const jsKey = camelCase(configKey) // 'scriptTimeout'

// Convert to kebab-case for file names
const moduleName = 'ConfigLoader'
const fileName = kebabCase(moduleName) // 'config-loader'
```

### Avoid es-toolkit for Trivial Operations

Do not import es-toolkit for checks that are clearer as one-liners. Reserve it for operations that are genuinely hard to get right.

#### Correct

```ts
// Simple null check - inline is clearer
if (x != null) {
  // ...
}

// Complex grouping - use es-toolkit
const grouped = groupBy(scripts, 'workspace')
const batches = chunk(workspaces, 100)
```

#### Incorrect

```ts
import { isNil } from 'es-toolkit'

// Overkill for a simple null check
if (!isNil(x)) {
  // ...
}
```

## Resources

- [es-toolkit Documentation](https://es-toolkit.sh)
- [es-toolkit GitHub](https://github.com/toss/es-toolkit)

## References

- [Functions](./functions.md) -- Pure function patterns
