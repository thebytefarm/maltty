import { jsonStringify } from '@maltty/utils/json'

import type { Format } from './types.js'

/**
 * Create the pure string formatter methods for a context.
 *
 * @private
 * @returns A Format instance with json and table formatters.
 */
export function createContextFormat(): Format {
  return Object.freeze({
    json(data: unknown): string {
      const [, json] = jsonStringify(data, { pretty: true })
      return `${json}\n`
    },
    table(rows: readonly Record<string, unknown>[]): string {
      if (rows.length === 0) {
        return ''
      }
      const [firstRow] = rows
      if (!firstRow) {
        return ''
      }
      return formatTable(rows, Object.keys(firstRow))
    },
  }) satisfies Format
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Format an unknown value as a string for table cell display.
 *
 * @private
 * @param val - The value to format.
 * @returns The stringified value, or empty string for undefined.
 */
function formatStringValue(val: unknown): string {
  if (val === undefined) {
    return ''
  }
  return String(val)
}

/**
 * Options for creating a table header string.
 *
 * @private
 */
interface TableHeaderOptions {
  keys: string[]
  widths: (number | undefined)[]
}

/**
 * Create a padded header row string from column keys and widths.
 *
 * @private
 * @param options - The keys and column widths.
 * @returns A formatted header string.
 */
function createTableHeader(options: TableHeaderOptions): string {
  const { keys, widths } = options
  return keys
    .map((key, idx) => {
      const width = widths[idx]
      if (width === undefined) {
        return key
      }
      return key.padEnd(width)
    })
    .join('  ')
}

/**
 * Options for creating a table row string.
 *
 * @private
 */
interface TableRowOptions {
  row: Record<string, unknown>
  keys: string[]
  widths: (number | undefined)[]
}

/**
 * Create a padded row string from a data record, column keys, and widths.
 *
 * @private
 * @param options - The row data, keys, and column widths.
 * @returns A formatted row string.
 */
function createTableRow(options: TableRowOptions): string {
  const { row, keys, widths } = options
  return keys
    .map((key, idx) => {
      const width = widths[idx]
      const val = formatStringValue(row[key])
      if (width === undefined) {
        return val
      }
      return val.padEnd(width)
    })
    .join('  ')
}

/**
 * Compute the maximum column width for each key across all rows.
 *
 * @private
 * @param rows - The data rows.
 * @param keys - The column keys.
 * @returns An array of column widths.
 */
function computeColumnWidths(rows: readonly Record<string, unknown>[], keys: string[]): number[] {
  return keys.map((key) => {
    const values = rows.map((row) => formatStringValue(row[key]))
    return Math.max(key.length, ...values.map((val) => val.length))
  })
}

/**
 * Format a table (header, separator, rows) as a string.
 *
 * @private
 * @param rows - The data rows.
 * @param keys - The column keys.
 * @returns The formatted table string.
 */
function formatTable(rows: readonly Record<string, unknown>[], keys: string[]): string {
  const widths = computeColumnWidths(rows, keys)
  const header = createTableHeader({ keys, widths })
  const separator = widths.map((width) => '-'.repeat(width)).join('  ')
  const dataRows = rows.map((row) => createTableRow({ keys, row, widths }))
  return `${[header, separator, ...dataRows].join('\n')}\n`
}
