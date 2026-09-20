import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

interface ExportEntry {
  readonly pkgName: string
  readonly exportKey: string
  readonly condition: string
  readonly filePath: string
  readonly pkgRoot: string
}

interface BinEntry {
  readonly pkgName: string
  readonly binName: string
  readonly binPath: string
  readonly pkgRoot: string
}

interface PackageJson {
  readonly name: string
  readonly exports?: Record<string, Record<string, string>>
  readonly bin?: Record<string, string>
}

const PACKAGES_DIR = fileURLToPath(new URL('../packages', import.meta.url))

const isDirectory = (name: string): boolean =>
  fs.statSync(path.join(PACKAGES_DIR, name)).isDirectory()

const readPackageJson = (pkgDir: string): PackageJson =>
  JSON.parse(
    fs.readFileSync(path.join(PACKAGES_DIR, pkgDir, 'package.json'), 'utf8')
  ) as PackageJson

const toExportEntries = (pkgDir: string): ExportEntry[] => {
  const pkg = readPackageJson(pkgDir)
  const pkgRoot = path.join(PACKAGES_DIR, pkgDir)

  if (!pkg.exports) {
    return []
  }

  return Object.entries(pkg.exports).flatMap(([exportKey, conditions]) =>
    Object.entries(conditions).map(([condition, filePath]) => ({
      pkgName: pkg.name,
      exportKey,
      condition,
      filePath,
      pkgRoot,
    }))
  )
}

const toBinEntries = (pkgDir: string): BinEntry[] => {
  const pkg = readPackageJson(pkgDir)
  const pkgRoot = path.join(PACKAGES_DIR, pkgDir)

  if (!pkg.bin) {
    return []
  }

  return Object.entries(pkg.bin).map(([binName, binPath]) => ({
    pkgName: pkg.name,
    binName,
    binPath,
    pkgRoot,
  }))
}

const packageDirs = fs.readdirSync(PACKAGES_DIR).filter(isDirectory)
const exportEntries = packageDirs.flatMap(toExportEntries)
const binEntries = packageDirs.flatMap(toBinEntries)

describe('package.json exports', () => {
  it.each(exportEntries)(
    '$pkgName "$exportKey" ($condition) → $filePath',
    ({ pkgRoot, filePath }) => {
      expect(
        fs.existsSync(path.join(pkgRoot, filePath)),
        `File does not exist: ${filePath}`
      ).toBeTruthy()
    }
  )
})

describe('package.json bin', () => {
  it.each(binEntries)('$pkgName bin "$binName" → $binPath', ({ pkgRoot, binPath }) => {
    expect(
      fs.existsSync(path.join(pkgRoot, binPath)),
      `Bin file does not exist: ${binPath}`
    ).toBeTruthy()
  })
})
