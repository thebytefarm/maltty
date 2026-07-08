import type { Store } from './types.js'

/**
 * Create an in-memory key-value store.
 *
 * @private
 * @returns A Store instance backed by a Map.
 */
export function createMemoryStore<TMap extends Record<string, unknown>>(): Store<TMap> {
  const map = new Map<string, unknown>()

  return {
    clear(): void {
      map.clear()
    },
    delete(key: string): boolean {
      return map.delete(key)
    },
    get<Key extends Extract<keyof TMap, string>>(key: Key): TMap[Key] | undefined {
      return map.get(key) as TMap[Key] | undefined
    },
    has(key: string): boolean {
      return map.has(key)
    },
    set<Key extends Extract<keyof TMap, string>>(key: Key, value: TMap[Key]): void {
      map.set(key, value)
    },
  }
}
