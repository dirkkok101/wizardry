#!/usr/bin/env ts-node
/**
 * Validate all race JSON files against Zod schema and source material
 *
 * Usage: npx ts-node scripts/validate-race-data.ts
 */

import * as fs from 'fs'
import * as path from 'path'
import {
  validateAndLoadRaceData,
  EXPECTED_RACE_DATA
} from '../src/types/RaceValidation.js'

const RACES_DIR = path.join(__dirname, '../data/races')
const RACE_FILES = ['human.json', 'elf.json', 'dwarf.json', 'gnome.json', 'hobbit.json']

interface ValidationReport {
  file: string
  success: boolean
  schemaErrors?: string[]
  sourceErrors?: string[]
}

function validateRaceFile(filename: string): ValidationReport {
  const filepath = path.join(RACES_DIR, filename)

  try {
    const rawData = JSON.parse(fs.readFileSync(filepath, 'utf-8'))
    const result = validateAndLoadRaceData(rawData)

    return {
      file: filename,
      success: result.success,
      schemaErrors: result.schemaErrors,
      sourceErrors: result.sourceErrors
    }
  } catch (error) {
    return {
      file: filename,
      success: false,
      schemaErrors: [`Failed to read or parse file: ${error instanceof Error ? error.message : String(error)}`]
    }
  }
}

function printReport(report: ValidationReport): void {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`File: ${report.file}`)
  console.log(`Status: ${report.success ? '✅ VALID' : '❌ INVALID'}`)

  if (report.schemaErrors && report.schemaErrors.length > 0) {
    console.log('\nSchema Errors:')
    report.schemaErrors.forEach(error => console.log(`  - ${error}`))
  }

  if (report.sourceErrors && report.sourceErrors.length > 0) {
    console.log('\nSource Material Validation Errors:')
    report.sourceErrors.forEach(error => console.log(`  - ${error}`))
  }
}

function printExpectedData(): void {
  console.log('\n' + '='.repeat(60))
  console.log('EXPECTED RACE DATA (from source material)')
  console.log('='.repeat(60))

  Object.entries(EXPECTED_RACE_DATA).forEach(([race, data]) => {
    console.log(`\n${race.toUpperCase()}:`)
    console.log(`  Base Stats: STR ${data.baseStats.str}, INT ${data.baseStats.int}, PIE ${data.baseStats.pie}, VIT ${data.baseStats.vit}, AGI ${data.baseStats.agi}, LUC ${data.baseStats.luc}`)
    console.log(`  Stat Total: ${data.statTotal}`)
    console.log(`  Saving Throw Bonus: ${JSON.stringify(data.savingThrowBonus)}`)
  })
}

function main(): void {
  console.log('Validating Wizardry 1 Race Data')
  console.log('Source Material: Data Driven Gamer, Strategy Wiki, Zimlab')
  console.log('='.repeat(60))

  const reports = RACE_FILES.map(validateRaceFile)

  reports.forEach(printReport)

  const validCount = reports.filter(r => r.success).length
  const totalCount = reports.length

  console.log('\n' + '='.repeat(60))
  console.log(`SUMMARY: ${validCount}/${totalCount} race files valid`)
  console.log('='.repeat(60))

  if (validCount < totalCount) {
    printExpectedData()
    process.exit(1)
  } else {
    console.log('\n✅ All race data validated successfully!')
    process.exit(0)
  }
}

main()
