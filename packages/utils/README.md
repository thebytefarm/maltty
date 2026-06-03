# @maltty/utils

Shared utilities for the maltty ecosystem. Provides functional programming helpers, filesystem operations, JSON handling, validation, and more.

## Installation

```bash
pnpm add @maltty/utils
```

## Usage

### Result tuples

```ts
import { ok, err } from '@maltty/utils'
import type { Result } from '@maltty/utils'

function divide(a: number, b: number): Result<number> {
  if (b === 0) return err(new Error('Division by zero'))
  return ok(a / b)
}

const [error, value] = divide(10, 2)
```

### Validation

```ts
import { validate } from '@maltty/utils'
import { z } from 'zod'

const schema = z.object({ name: z.string(), port: z.number() })
const [error, config] = validate(schema, input)
```

### JSON

```ts
import { jsonParse, jsonStringify } from '@maltty/utils/json'

const [parseError, data] = jsonParse(rawString)
const [stringifyError, json] = jsonStringify(data, { pretty: true })
```

### Filesystem

```ts
import { fileExists } from '@maltty/utils/fs'

const exists = await fileExists('/path/to/file')
```

### FP utilities

The `@maltty/utils/fp` subpath re-exports all of `es-toolkit` and `ts-pattern` alongside maltty's Result helpers and predicates.

```ts
import { match, P, isString, pipe } from '@maltty/utils/fp'
```

## Subpath exports

| Export                   | Description                               |
| ------------------------ | ----------------------------------------- |
| `@maltty/utils`          | Core exports (Result, validate, fs, etc.) |
| `@maltty/utils/fp`       | es-toolkit + ts-pattern + Result helpers  |
| `@maltty/utils/fs`       | Filesystem utilities                      |
| `@maltty/utils/json`     | JSON parse/stringify with Result tuples   |
| `@maltty/utils/manifest` | package.json reader                       |
| `@maltty/utils/redact`   | Sensitive data redaction                  |
| `@maltty/utils/validate` | Zod schema validation                     |
| `@maltty/utils/tag`      | Runtime type tagging                      |

## License

MIT -- [GitHub](https://github.com/thebytefarm/maltty)
