---
paths:
  - 'packages/**/src/**/*.ts'
---

# Error Handling Rules

All expected failures use the `Result<T, E>` tuple type. Never throw exceptions.

## Result Type

```ts
type Result<T, E = Error> = readonly [E, null] | readonly [null, T]
```

- Success: `[null, value]`
- Failure: `[error, null]`

## Conventions

- Define domain-specific error interfaces with a descriptive `type` or `reason` field
- Create type aliases for domain results (e.g., `type ConfigResult<T> = Result<T, ConfigError>`)
- Use `ok()` and `fail()` constructors where available (e.g., `HandlerResult` in maltty package)
- Wrap async operations that can reject with a try/catch that returns a Result tuple

## Chaining with Early Returns

```ts
const [configError, config] = loadConfig(workspace)
if (configError) return [configError, null]

const [resolveError, script] = resolveScript(config, name)
if (resolveError) return [resolveError, null]

return [null, script]
```

## Error Type Pattern

```ts
interface ConfigError {
  readonly type: 'invalid_toml' | 'missing_field' | 'unknown_workspace'
  readonly message: string
}
```

## Rules

- Never throw inside a function that returns `Result`
- Always check the error element before accessing the value
- Use `ts-pattern` `match` for exhaustive handling of multiple error variants
- Map low-level errors (e.g., jose errors) to domain-specific error reasons
