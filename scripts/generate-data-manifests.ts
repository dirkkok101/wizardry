#!/usr/bin/env tsx
/**
 * Data Manifest Generator
 *
 * Generates index.json manifest files for all game data directories.
 * This ensures data loaders can dynamically discover files without
 * hardcoded lists that can go out of sync.
 *
 * Usage: tsx scripts/generate-data-manifests.ts
 * Called automatically via: npm run generate:manifests
 */

import * as fs from 'fs'
import * as path from 'path'

const dataDir = path.join(process.cwd(), 'data')

// Data directories to generate manifests for
const directories = [
  'traps',
  'items',
  'monsters',
  'spells',
  'races',
  'classes',
  'encounters'
]

interface ManifestResult {
  dir: string
  files: string[]
  success: boolean
  error?: string
}

function generateManifest(dir: string): ManifestResult {
  const dirPath = path.join(dataDir, dir)
  const outputPath = path.join(dirPath, 'index.json')

  try {
    // Check directory exists
    if (!fs.existsSync(dirPath)) {
      return { dir, files: [], success: false, error: `Directory not found: ${dirPath}` }
    }

    // Scan directory for JSON files (exclude index.json itself)
    const files = fs.readdirSync(dirPath)
      .filter(f => f.endsWith('.json') && f !== 'index.json')
      .map(f => f.replace('.json', ''))
      .sort()

    // Write manifest
    fs.writeFileSync(outputPath, JSON.stringify(files, null, 2) + '\n')

    return { dir, files, success: true }
  } catch (error) {
    return { dir, files: [], success: false, error: String(error) }
  }
}

// Generate all manifests
console.log('Generating data manifests...\n')

let totalFiles = 0
let successCount = 0

for (const dir of directories) {
  const result = generateManifest(dir)

  if (result.success) {
    console.log(`✅ ${dir}/index.json: ${result.files.length} files`)
    totalFiles += result.files.length
    successCount++
  } else {
    console.log(`❌ ${dir}/index.json: ${result.error}`)
  }
}

console.log(`\n📦 Generated ${successCount}/${directories.length} manifests (${totalFiles} total files)`)

// Exit with error if any failed
if (successCount < directories.length) {
  process.exit(1)
}
