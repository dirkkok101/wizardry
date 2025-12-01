#!/usr/bin/env tsx
/**
 * Item JSON Validation Script
 *
 * Validates all item JSON files in data/items/ against:
 * 1. Zod schemas for type safety and structure
 * 2. Original Wizardry 1 source data (from equipment reference)
 * 3. Numeric ID mapping consistency
 * 4. Index.json manifest consistency
 *
 * Usage: tsx scripts/validate-items.ts
 */

import { z } from 'zod'
import * as fs from 'fs'
import * as path from 'path'
import { ItemSchema, ValidatedItem } from '../src/app/validation/item-schema'

// ============================================================================
// VALIDATION TYPES
// ============================================================================

interface ValidationResult {
  file: string
  success: boolean
  errors?: z.ZodError | Error
  item?: ValidatedItem
}

interface PropertyIssue {
  file: string
  property: string
  expected: string
  actual: string
}

interface ValidationSummary {
  totalFiles: number
  validFiles: number
  invalidFiles: number
  results: ValidationResult[]
  missingItems: string[]
  extraItems: string[]
  nameIssues: { file: string; expected: string; actual: string }[]
  indexIssues: { type: 'missing_from_index' | 'missing_file'; item: string }[]
  numericIdIssues: { numericId: number; expectedItem: string; status: string }[]
  propertyIssues: PropertyIssue[]
}

// ============================================================================
// EXPECTED ITEMS FROM WIZARDRY 1 REFERENCE
// ============================================================================

/**
 * Expected items from Wizardry 1 equipment reference (Item_System_Reference.md)
 * This is the canonical list from the original game - 94 items total (IDs 1-94)
 * Plus quest items (IDs 95-100) and broken item (ID 0)
 */
const EXPECTED_ITEMS: Record<string, string> = {
  // Broken Item (ID 0)
  'broken_item': 'Broken Item',

  // Basic Weapons (IDs 1-6)
  'long_sword': 'Long Sword',
  'short_sword': 'Short Sword',
  'anointed_mace': 'Anointed Mace',
  'anointed_flail': 'Anointed Flail',
  'staff': 'Staff',
  'dagger': 'Dagger',

  // Shields (IDs 7-8)
  'small_shield': 'Small Shield',
  'large_shield': 'Large Shield',

  // Basic Armor (IDs 9-14)
  'robes': 'Robes',
  'leather_armor': 'Leather Armor',
  'chain_mail': 'Chain Mail',
  'breast_plate': 'Breast Plate',
  'plate_mail': 'Plate Mail',
  'helm': 'Helm',

  // Consumables (IDs 15-16, 21, 27-28)
  'potion_dios': 'Potion of Curing',
  'potion_latumofis': 'Potion of Neutralization',
  'scroll_katino': 'Scroll/Katino',
  'scroll_badios': 'Scroll/Badios',
  'scroll_halito': 'Scroll/Halito',

  // Enhanced Weapons +1 (IDs 17-19)
  'long_sword_1': 'Long Sword +1',
  'short_sword_1': 'Short Sword +1',
  'mace_1': 'Mace +1',

  // Special Staff (ID 20)
  'staff_mogref': 'Staff of Mogref',

  // Enhanced Armor +1 (IDs 22-26)
  'leather_1': 'Leather +1',
  'chain_1': 'Chain +1',
  'plate_mail_1': 'Plate Mail +1',
  'shield_1': 'Shield +1',
  'breast_plate_1': 'Breast Plate +1',

  // Cursed Weapons -1 (IDs 29-31)
  'long_sword_cursed_1': 'Long Sword -1',
  'short_sword_cursed_1': 'Short Sword -1',
  'mace_cursed_1': 'Mace -1',

  // Enhanced Staff +2 (ID 32)
  'staff_2': 'Staff +2',

  // Specialty Weapons (IDs 33, 55-59, 72, 83, 86-87)
  'dragon_slayer': 'Dragon Slayer',
  'were_slayer': 'Were Slayer',
  'mage_masher': 'Mage Masher',
  'mace_protection': 'Mace of Protection',
  'staff_montino': 'Staff/Montino',
  'blade_cusinart': "Blade Cusinart'",
  'dagger_speed': 'Dagger of Speed',
  'thieves_dagger': 'Thieves Dagger',
  'murasama_blade': 'Murasama Blade',
  'shuriken': 'Shuriken',
  'vorpal_blade': 'Vorpal Blade',

  // Helm +1 (ID 34) - Never drops due to bug
  'helm_1': 'Helm +1',

  // Cursed Armor -1 (IDs 35-38)
  'leather_cursed_1': 'Leather -1',
  'chain_cursed_1': 'Chain -1',
  'breast_plate_cursed_1': 'Breast Plate -1',
  'shield_cursed_1': 'Shield -1',

  // Accessories (IDs 39, 54, 60-61, 65, 91-93)
  'jeweled_amulet': 'Jeweled Amulet',
  'ring_porfic': 'Ring of Porfic',
  'amulet_manifo': 'Amulet/Manifo',
  'rod_flame': 'Rod of Flame',
  'amulet_makanito': 'Amulet/Makanito',
  'ring_healing': 'Ring of Healing',
  'ring_pro_undead': 'Ring Pro Undead',
  'deadly_ring': 'Deadly Ring',

  // More Consumables (IDs 40-41, 45-46, 53, 67)
  'potion_sopic': 'Potion of Glass',
  'scroll_lomilwa': 'Scroll/Lomilwa',
  'scroll_dilto': 'Scroll/Dilto',
  'potion_dial': 'Potion of Healing',
  'scroll_badial': 'Scroll/Badial',

  // Enhanced Weapons +2 (IDs 42-44, 69)
  'long_sword_2': 'Long Sword +2',
  'short_sword_2': 'Short Sword +2',
  'mace_2': 'Mace +2',
  'dagger_2': 'Dagger +2',

  // Gauntlets (IDs 47, 80)
  'copper_gloves': 'Copper Gloves',
  'silver_gloves': 'Silver Gloves',

  // Enhanced Armor +2 (IDs 48-52, 62-64, 79)
  'leather_2': 'Leather +2',
  'chain_2': 'Chain +2',
  'plate_mail_2': 'Plate Mail +2',
  'shield_2': 'Shield +2',
  'helm_2_evil': 'Helm +2 (Evil)',
  'evil_chain_2': 'Evil Chain +2',
  'neut_pmail_2': 'Neut P-Mail +2',
  'evil_shield_3': 'Evil Shield +3',
  'breast_plate_2': 'Breast Plate +2',

  // Helmet (ID 66)
  'diadem_malor': 'Diadem of Malor',

  // Cursed Weapons -2 (IDs 68, 70-71)
  'short_sword_cursed_2': 'Short Sword -2',
  'mace_cursed_2': 'Mace -2',
  'staff_cursed_2': 'Staff -2',

  // Cursed Armor -2 (IDs 73-78)
  'cursed_robe': 'Cursed Robe',
  'leather_cursed_2': 'Leather -2',
  'chain_cursed_2': 'Chain -2',
  'breast_plate_cursed_2': 'Breast Plate -2',
  'shield_cursed_2': 'Shield -2',
  'cursed_helmet': 'Cursed Helmet',

  // Evil/Legendary Weapons (IDs 81-82)
  'evil_sword_3': 'Evil Sword +3',
  'evil_short_sword_3': 'Evil S-Sword +3',

  // Enhanced Armor +3 (IDs 84-85, 88-90)
  'breast_plate_3': 'Breast Plate +3',
  'lords_garb': 'Lords Garb',
  'chain_pro_fire': 'Chain Pro Fire',
  'evil_plate_3': 'Evil Plate +3',
  'shield_3': 'Shield +3',

  // Legendary Item (ID 94)
  'werdna_amulet': "Werdna's Amulet",

  // Quest Items (IDs 95-100)
  'statuette_bear': 'Statuette of Bear',
  'statuette_frog': 'Statuette of Frog',
  'bronze_key': 'Bronze Key',
  'silver_key': 'Silver Key',
  'gold_key': 'Gold Key',
  'blue_ribbon': 'Blue Ribbon',

  // Additional items not in original list but in codebase
  'armor_heroes': 'Armor of Heroes',
  'great_helm': 'Great Helm',
  'dagger_1': 'Dagger +1'
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Load and validate a single item JSON file
 */
function validateItemFile(filePath: string): ValidationResult {
  const fileName = path.basename(filePath)

  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8')
    const jsonData = JSON.parse(fileContent)

    // Validate against schema
    const result = ItemSchema.safeParse(jsonData)

    if (result.success) {
      return {
        file: fileName,
        success: true,
        item: result.data
      }
    } else {
      return {
        file: fileName,
        success: false,
        errors: result.error
      }
    }
  } catch (error) {
    return {
      file: fileName,
      success: false,
      errors: error as Error
    }
  }
}

/**
 * Load numeric ID mapping from JSON
 */
function loadNumericIdMapping(): Record<string, string> | null {
  const mappingPath = path.join(process.cwd(), 'data', 'items', 'numeric-id-mapping.json')

  try {
    const content = fs.readFileSync(mappingPath, 'utf-8')
    const data = JSON.parse(content)
    return data.mapping || {}
  } catch (error) {
    console.warn('Warning: Could not load numeric-id-mapping.json')
    return null
  }
}

/**
 * Load index.json manifest
 */
function loadIndexManifest(): string[] | null {
  const indexPath = path.join(process.cwd(), 'data', 'items', 'index.json')

  try {
    const content = fs.readFileSync(indexPath, 'utf-8')
    return JSON.parse(content)
  } catch (error) {
    console.warn('Warning: Could not load index.json')
    return null
  }
}

/**
 * Validate item properties against reference
 */
function validateItemProperties(item: ValidatedItem): PropertyIssue[] {
  const issues: PropertyIssue[] = []
  const fileName = `${item.id}.json`

  // Validate AC range for armor/shields/helmets/gauntlets
  if ('ac' in item) {
    const ac = item.ac as number
    if (ac < -2 || ac > 10) {
      issues.push({
        file: fileName,
        property: 'ac',
        expected: '-2 to 10',
        actual: String(ac)
      })
    }
  }

  // Validate enhancement matches item name pattern
  if ('enhancement' in item) {
    const enhancement = item.enhancement as number
    const name = item.name

    // Check +X items have positive enhancement
    const plusMatch = name.match(/\+(\d+)/)
    if (plusMatch) {
      const expectedEnhancement = parseInt(plusMatch[1], 10)
      if (enhancement !== expectedEnhancement) {
        issues.push({
          file: fileName,
          property: 'enhancement',
          expected: String(expectedEnhancement),
          actual: String(enhancement)
        })
      }
    }

    // Check -X items have negative enhancement
    const minusMatch = name.match(/-(\d+)/)
    if (minusMatch) {
      const expectedEnhancement = -parseInt(minusMatch[1], 10)
      if (enhancement !== expectedEnhancement) {
        issues.push({
          file: fileName,
          property: 'enhancement',
          expected: String(expectedEnhancement),
          actual: String(enhancement)
        })
      }
    }
  }

  // Validate swingCount range for weapons
  if ('swingCount' in item) {
    const swingCount = item.swingCount as number
    if (swingCount < 1 || swingCount > 10) {
      issues.push({
        file: fileName,
        property: 'swingCount',
        expected: '1 to 10',
        actual: String(swingCount)
      })
    }
  }

  return issues
}

/**
 * Validate all item JSON files in data/items/
 */
function validateAllItems(): ValidationSummary {
  const itemsDir = path.join(process.cwd(), 'data', 'items')
  const excludedFiles = ['index.json', 'numeric-id-mapping.json']
  const files = fs.readdirSync(itemsDir)
    .filter(f => f.endsWith('.json') && !excludedFiles.includes(f))

  const results: ValidationResult[] = []
  const foundItems = new Set<string>()
  const nameIssues: { file: string; expected: string; actual: string }[] = []
  const propertyIssues: PropertyIssue[] = []

  // Validate each item file
  for (const file of files) {
    const filePath = path.join(itemsDir, file)
    const result = validateItemFile(filePath)
    results.push(result)

    if (result.success && result.item) {
      const itemId = result.item.id
      foundItems.add(itemId)

      // Check if name matches expected
      if (EXPECTED_ITEMS[itemId]) {
        const expected = EXPECTED_ITEMS[itemId]
        if (result.item.name !== expected) {
          nameIssues.push({
            file,
            expected,
            actual: result.item.name
          })
        }
      }

      // Validate item properties
      const propIssues = validateItemProperties(result.item)
      propertyIssues.push(...propIssues)
    }
  }

  // Find missing items
  const expectedIds = new Set(Object.keys(EXPECTED_ITEMS))
  const missingItems = Array.from(expectedIds).filter(id => !foundItems.has(id))

  // Find extra items (not in expected list)
  const extraItems = Array.from(foundItems).filter(id => !expectedIds.has(id))

  // Validate index.json consistency
  const indexIssues: { type: 'missing_from_index' | 'missing_file'; item: string }[] = []
  const indexManifest = loadIndexManifest()
  if (indexManifest) {
    const indexSet = new Set(indexManifest)

    // Check items in files but not in index
    for (const itemId of foundItems) {
      if (!indexSet.has(itemId)) {
        indexIssues.push({ type: 'missing_from_index', item: itemId })
      }
    }

    // Check items in index but no file
    for (const itemId of indexManifest) {
      if (!foundItems.has(itemId)) {
        indexIssues.push({ type: 'missing_file', item: itemId })
      }
    }
  }

  // Validate numeric ID mapping
  const numericIdIssues: { numericId: number; expectedItem: string; status: string }[] = []
  const numericIdMapping = loadNumericIdMapping()
  if (numericIdMapping) {
    for (const [numericIdStr, itemId] of Object.entries(numericIdMapping)) {
      const numericId = parseInt(numericIdStr, 10)
      if (!foundItems.has(itemId)) {
        numericIdIssues.push({
          numericId,
          expectedItem: itemId,
          status: 'Item file not found'
        })
      }
    }
  }

  const validFiles = results.filter(r => r.success).length
  const invalidFiles = results.filter(r => !r.success).length

  return {
    totalFiles: results.length,
    validFiles,
    invalidFiles,
    results,
    missingItems,
    extraItems,
    nameIssues,
    indexIssues,
    numericIdIssues,
    propertyIssues
  }
}

/**
 * Print validation results
 */
function printResults(summary: ValidationSummary): void {
  console.log('\n═══════════════════════════════════════════════════════')
  console.log('  WIZARDRY 1 ITEM JSON VALIDATION REPORT')
  console.log('═══════════════════════════════════════════════════════\n')

  // Summary
  console.log('📊 SUMMARY')
  console.log('─────────────────────────────────────────────────────')
  console.log(`Total files:     ${summary.totalFiles}`)
  console.log(`✅ Valid:        ${summary.validFiles}`)
  console.log(`❌ Invalid:      ${summary.invalidFiles}`)
  console.log(`📝 Expected:     ${Object.keys(EXPECTED_ITEMS).length}`)
  console.log(`❓ Missing:      ${summary.missingItems.length}`)
  console.log(`➕ Extra:        ${summary.extraItems.length}`)
  console.log(`⚠️  Name Issues:  ${summary.nameIssues.length}`)
  console.log(`📋 Index Issues: ${summary.indexIssues.length}`)
  console.log(`🔢 ID Issues:    ${summary.numericIdIssues.length}`)
  console.log(`🔧 Prop Issues:  ${summary.propertyIssues.length}`)
  console.log()

  // Invalid files
  if (summary.invalidFiles > 0) {
    console.log('❌ VALIDATION ERRORS')
    console.log('─────────────────────────────────────────────────────')
    summary.results
      .filter(r => !r.success)
      .forEach(result => {
        console.log(`\n  File: ${result.file}`)
        if (result.errors) {
          if (result.errors instanceof z.ZodError) {
            result.errors.errors.forEach(err => {
              console.log(`    - ${err.path.join('.')}: ${err.message}`)
            })
          } else {
            console.log(`    Error: ${result.errors.message}`)
          }
        }
      })
    console.log()
  }

  // Missing items
  if (summary.missingItems.length > 0) {
    console.log('❓ MISSING ITEMS (Expected but not found)')
    console.log('─────────────────────────────────────────────────────')
    summary.missingItems.forEach(id => {
      console.log(`  - ${id}.json (${EXPECTED_ITEMS[id]})`)
    })
    console.log()
  }

  // Extra items
  if (summary.extraItems.length > 0) {
    console.log('➕ EXTRA ITEMS (Found but not in expected list)')
    console.log('─────────────────────────────────────────────────────')
    summary.extraItems.forEach(id => {
      console.log(`  - ${id}.json`)
    })
    console.log()
  }

  // Name issues
  if (summary.nameIssues.length > 0) {
    console.log('⚠️  NAME ISSUES (Incorrect item names)')
    console.log('─────────────────────────────────────────────────────')
    summary.nameIssues.forEach(issue => {
      console.log(`  File: ${issue.file}`)
      console.log(`    Expected: "${issue.expected}"`)
      console.log(`    Actual:   "${issue.actual}"`)
    })
    console.log()
  }

  // Index.json issues
  if (summary.indexIssues.length > 0) {
    console.log('📋 INDEX.JSON ISSUES')
    console.log('─────────────────────────────────────────────────────')
    summary.indexIssues.forEach(issue => {
      if (issue.type === 'missing_from_index') {
        console.log(`  - ${issue.item}.json exists but not in index.json`)
      } else {
        console.log(`  - ${issue.item} in index.json but file not found`)
      }
    })
    console.log()
  }

  // Numeric ID issues
  if (summary.numericIdIssues.length > 0) {
    console.log('🔢 NUMERIC ID MAPPING ISSUES')
    console.log('─────────────────────────────────────────────────────')
    summary.numericIdIssues.forEach(issue => {
      console.log(`  - ID ${issue.numericId}: ${issue.expectedItem} - ${issue.status}`)
    })
    console.log()
  }

  // Property issues
  if (summary.propertyIssues.length > 0) {
    console.log('🔧 PROPERTY ISSUES')
    console.log('─────────────────────────────────────────────────────')
    summary.propertyIssues.forEach(issue => {
      console.log(`  ${issue.file}: ${issue.property}`)
      console.log(`    Expected: ${issue.expected}`)
      console.log(`    Actual:   ${issue.actual}`)
    })
    console.log()
  }

  // Final status
  console.log('═══════════════════════════════════════════════════════')
  const hasErrors = summary.invalidFiles > 0 ||
    summary.missingItems.length > 0 ||
    summary.indexIssues.length > 0 ||
    summary.numericIdIssues.length > 0

  if (!hasErrors) {
    console.log('✅ ALL ITEMS VALIDATED SUCCESSFULLY!')
    if (summary.nameIssues.length > 0 || summary.propertyIssues.length > 0) {
      console.log('   (with warnings - see above)')
    }
  } else {
    console.log('❌ VALIDATION FAILED - Please fix the issues above')
  }
  console.log('═══════════════════════════════════════════════════════\n')
}

// ============================================================================
// MAIN
// ============================================================================

function main() {
  console.log('Starting item JSON validation...\n')

  const summary = validateAllItems()
  printResults(summary)

  // Exit with error code if validation failed (but not for name/property warnings)
  const hasErrors = summary.invalidFiles > 0 ||
    summary.missingItems.length > 0 ||
    summary.indexIssues.length > 0 ||
    summary.numericIdIssues.length > 0

  if (hasErrors) {
    process.exit(1)
  }
}

main()
