#!/usr/bin/env tsx
/**
 * Item JSON Validation Script
 *
 * Validates all item JSON files in data/items/ against:
 * 1. Zod schemas for type safety and structure
 * 2. Original Wizardry 1 source data (from equipment reference)
 *
 * Usage: tsx scripts/validate-items.ts
 */

import { z } from 'zod'
import * as fs from 'fs'
import * as path from 'path'
import { ItemSchema, ValidatedItem } from '../src/validation/item-schema'

// ============================================================================
// VALIDATION LOGIC
// ============================================================================

interface ValidationResult {
  file: string
  success: boolean
  errors?: z.ZodError
  item?: ValidatedItem
}

interface ValidationSummary {
  totalFiles: number
  validFiles: number
  invalidFiles: number
  results: ValidationResult[]
  missingItems: string[]
  extraItems: string[]
  nameIssues: { file: string; expected: string; actual: string }[]
}

/**
 * Expected items from Wizardry 1 equipment reference
 * This is the canonical list from the original game
 */
const EXPECTED_ITEMS = {
  // Basic Weapons
  'dagger': 'Dagger',
  'staff': 'Staff',
  'short_sword': 'Short Sword',
  'long_sword': 'Long Sword',
  'anointed_mace': 'Anointed Mace',
  'anointed_flail': 'Anointed Flail',

  // Enhanced Weapons (+1)
  'dagger_1': 'Dagger +1',
  'short_sword_1': 'Short Sword +1',
  'long_sword_1': 'Long Sword +1',
  'mace_1': 'Mace +1',

  // Enhanced Weapons (+2)
  'dagger_2': 'Dagger +2',
  'short_sword_2': 'Short Sword +2',
  'long_sword_2': 'Long Sword +2',
  'mace_2': 'Mace +2',
  'staff_2': 'Staff +2',

  // Specialty Weapons
  'dragon_slayer': 'Dragon Slayer',
  'were_slayer': 'Were Slayer',
  'mage_masher': 'Mage Masher',
  'mace_protection': 'Mace of Protection',
  'blade_cusinart': "Blade Cusinart'",
  'staff_mogref': 'Staff of Mogref',
  'staff_montino': 'Staff/Montino',
  'vorpal_blade': 'Vorpal Blade',
  'dagger_speed': 'Dagger of Speed',
  'thieves_dagger': 'Thieves Dagger',
  'shuriken': 'Shuriken',
  'murasama_blade': 'Murasama Blade',

  // Evil Weapons
  'evil_sword_3': 'Evil Sword +3',

  // Cursed Weapons
  'staff_cursed_2': 'Staff -2',
  'short_sword_cursed_1': 'Short Sword -1',
  'short_sword_cursed_2': 'Short Sword -2',
  'long_sword_cursed_1': 'Long Sword -1',
  'mace_cursed_1': 'Mace -1',
  'mace_cursed_2': 'Mace -2',

  // Basic Armor
  'robes': 'Robes',
  'leather_armor': 'Leather Armor',
  'chain_mail': 'Chain Mail',
  'breast_plate': 'Breast Plate',
  'plate_mail': 'Plate Mail',

  // Enhanced Armor (+1)
  'leather_1': 'Leather +1',
  'chain_1': 'Chain +1',
  'breast_plate_1': 'Breast Plate +1',
  'plate_mail_1': 'Plate Mail +1',

  // Enhanced Armor (+2)
  'leather_2': 'Leather +2',
  'chain_2': 'Chain +2',
  'breast_plate_2': 'Breast Plate +2',
  'plate_mail_2': 'Plate Mail +2',

  // Enhanced Armor (+3)
  'breast_plate_3': 'Breast Plate +3',

  // Special Armor
  'armor_heroes': 'Armor of Heroes',
  'chain_pro_fire': 'Chain Pro Fire',
  'evil_plate_3': 'Evil Plate +3',
  'neut_pmail_2': 'Neut P-Mail +2',
  'lords_garb': 'Lords Garb',

  // Cursed Armor
  'cursed_robe': 'Cursed Robe',
  'leather_cursed_1': 'Leather -1',
  'leather_cursed_2': 'Leather -2',
  'chain_cursed_1': 'Chain -1',
  'chain_cursed_2': 'Chain -2',
  'breast_plate_cursed_1': 'Breast Plate -1',
  'breast_plate_cursed_2': 'Breast Plate -2',

  // Shields
  'small_shield': 'Small Shield',
  'large_shield': 'Large Shield',
  'shield_1': 'Shield +1',
  'shield_2': 'Shield +2',
  'evil_shield_3': 'Evil Shield +3',
  'shield_3': 'Shield +3',

  // Cursed Shields
  'shield_cursed_1': 'Shield -1',
  'shield_cursed_2': 'Shield -2',

  // Helmets
  'helm': 'Helm',
  'helm_1': 'Helm +1',
  'helm_2_evil': 'Helm +2 (Evil)',
  'great_helm': 'Great Helm',
  'diadem_malor': 'Diadem of Malor',

  // Cursed Helmets
  'cursed_helmet': 'Cursed Helmet',

  // Gauntlets
  'copper_gloves': 'Copper Gloves',
  'silver_gloves': 'Silver Gloves',

  // Accessories
  'jeweled_amulet': 'Jeweled Amulet',
  'ring_porfic': 'Ring of Porfic',
  'amulet_manifo': 'Amulet/Manifo',
  'amulet_makanito': 'Amulet/Makanito',
  'rod_flame': 'Rod of Flame',
  'ring_healing': 'Ring of Healing',
  'ring_pro_undead': 'Ring Pro Undead',
  'deadly_ring': 'Deadly Ring',

  // Consumables - Potions
  'potion_latumofis': 'Potion of Neutralization',
  'potion_dios': 'Potion of Curing',
  'potion_sopic': 'Potion of Glass',
  'potion_dial': 'Potion of Healing',

  // Consumables - Scrolls
  'scroll_katino': 'Scroll/Kanito',
  'scroll_badios': 'Scroll/Badios',
  'scroll_halito': 'Scroll/Halito',
  'scroll_lomilwa': 'Scroll/Lomilwa',
  'scroll_dilto': 'Scroll/Dilto',
  'scroll_badial': 'Scroll/Badial',

  // Special Items
  'bronze_key': 'Bronze Key',
  'silver_key': 'Silver Key',
  'gold_key': 'Gold Key',
  'blue_ribbon': 'Blue Ribbon',
  'statuette_bear': 'Statuette of Bear',
  'statuette_frog': 'Statuette of Frog',
  'werdna_amulet': "Werdna's Amulet",
  'broken_item': 'Broken Item'
}

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
      errors: error as any
    }
  }
}

/**
 * Validate all item JSON files in data/items/
 */
function validateAllItems(): ValidationSummary {
  const itemsDir = path.join(process.cwd(), 'data', 'items')
  const files = fs.readdirSync(itemsDir).filter(f => f.endsWith('.json'))

  const results: ValidationResult[] = []
  const foundItems = new Set<string>()
  const nameIssues: { file: string; expected: string; actual: string }[] = []

  for (const file of files) {
    const filePath = path.join(itemsDir, file)
    const result = validateItemFile(filePath)
    results.push(result)

    if (result.success && result.item) {
      const itemId = result.item.id
      foundItems.add(itemId)

      // Check if name matches expected
      if (EXPECTED_ITEMS[itemId as keyof typeof EXPECTED_ITEMS]) {
        const expected = EXPECTED_ITEMS[itemId as keyof typeof EXPECTED_ITEMS]
        if (result.item.name !== expected) {
          nameIssues.push({
            file,
            expected,
            actual: result.item.name
          })
        }
      }
    }
  }

  // Find missing items
  const expectedIds = new Set(Object.keys(EXPECTED_ITEMS))
  const missingItems = Array.from(expectedIds).filter(id => !foundItems.has(id))

  // Find extra items (not in expected list)
  const extraItems = Array.from(foundItems).filter(id => !expectedIds.has(id))

  const validFiles = results.filter(r => r.success).length
  const invalidFiles = results.filter(r => !r.success).length

  return {
    totalFiles: results.length,
    validFiles,
    invalidFiles,
    results,
    missingItems,
    extraItems,
    nameIssues
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
  console.log(`Total files:   ${summary.totalFiles}`)
  console.log(`✅ Valid:      ${summary.validFiles}`)
  console.log(`❌ Invalid:    ${summary.invalidFiles}`)
  console.log(`📝 Expected:   ${Object.keys(EXPECTED_ITEMS).length}`)
  console.log(`❓ Missing:    ${summary.missingItems.length}`)
  console.log(`➕ Extra:      ${summary.extraItems.length}`)
  console.log(`⚠️  Name Issues: ${summary.nameIssues.length}`)
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
          console.log(`  Error: ${JSON.stringify(result.errors, null, 2)}`)
        }
      })
    console.log()
  }

  // Missing items
  if (summary.missingItems.length > 0) {
    console.log('❓ MISSING ITEMS (Expected but not found)')
    console.log('─────────────────────────────────────────────────────')
    summary.missingItems.forEach(id => {
      console.log(`  - ${id}.json (${EXPECTED_ITEMS[id as keyof typeof EXPECTED_ITEMS]})`)
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
      console.log()
    })
  }

  // Final status
  console.log('═══════════════════════════════════════════════════════')
  if (summary.invalidFiles === 0 && summary.missingItems.length === 0 && summary.nameIssues.length === 0) {
    console.log('✅ ALL ITEMS VALIDATED SUCCESSFULLY!')
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

  // Exit with error code if validation failed
  if (summary.invalidFiles > 0 || summary.missingItems.length > 0 || summary.nameIssues.length > 0) {
    process.exit(1)
  }
}

main()
