#!/usr/bin/env ts-node
/**
 * Validate all class JSON files against Zod schema
 *
 * Usage: npx ts-node scripts/validate-class-json.ts
 *
 * This script reads all class JSON files from data/classes/ and validates
 * them against the Zod schema defined in src/types/CharacterClass.schema.ts
 */

import * as fs from 'fs'
import * as path from 'path'
import { safeValidateClassData } from '../src/types/CharacterClass.schema'
import type { ZodIssue } from 'zod'

const CLASSES_DIR = path.join(__dirname, '../data/classes')

interface ValidationResult {
  classId: string
  filePath: string
  valid: boolean
  errors?: string[]
}

function getAllClassFiles(): string[] {
  const files = fs.readdirSync(CLASSES_DIR)
  return files.filter(file => file.endsWith('.json'))
}

function validateClassFile(fileName: string): ValidationResult {
  const filePath = path.join(CLASSES_DIR, fileName)
  const classId = fileName.replace('.json', '')

  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8')
    const jsonData = JSON.parse(fileContent)

    const result = safeValidateClassData(jsonData)

    if (result.success) {
      return {
        classId,
        filePath,
        valid: true
      }
    } else {
      const errors = result.error!.issues.map((err: ZodIssue) => {
        const errorPath = err.path.join('.')
        return `  - ${errorPath}: ${err.message}`
      })

      return {
        classId,
        filePath,
        valid: false,
        errors
      }
    }
  } catch (error) {
    return {
      classId,
      filePath,
      valid: false,
      errors: [`  - Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`]
    }
  }
}

function main() {
  console.log('🔍 Validating class JSON files...\n')

  const classFiles = getAllClassFiles()
  const results: ValidationResult[] = []

  for (const file of classFiles) {
    const result = validateClassFile(file)
    results.push(result)

    if (result.valid) {
      console.log(`✅ ${result.classId.toUpperCase()}: Valid`)
    } else {
      console.log(`❌ ${result.classId.toUpperCase()}: Invalid`)
      if (result.errors) {
        console.log(result.errors.join('\n'))
      }
    }
  }

  console.log('\n' + '='.repeat(60))

  const validCount = results.filter(r => r.valid).length
  const totalCount = results.length

  console.log(`\n📊 Validation Summary:`)
  console.log(`   Total classes: ${totalCount}`)
  console.log(`   Valid: ${validCount}`)
  console.log(`   Invalid: ${totalCount - validCount}`)

  if (validCount === totalCount) {
    console.log('\n🎉 All class JSON files are valid!')
    process.exit(0)
  } else {
    console.log('\n⚠️  Some class JSON files have validation errors.')
    console.log('   Please fix the errors above and run this script again.')
    process.exit(1)
  }
}

// Run validation
main()
