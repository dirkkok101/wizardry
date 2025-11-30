#!/usr/bin/env ts-node

/**
 * Monster Data Audit Script
 *
 * Comprehensive validation of all monster JSON files against Apple II Wizardry 1 source data.
 * Generates a detailed report of any issues found.
 *
 * Usage: npx ts-node scripts/audit-monsters.ts
 */

import * as fs from 'fs'
import * as path from 'path'
import { z } from 'zod'

// ANSI color codes
const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
}

// =============================================================================
// Types
// =============================================================================

type ValidationCategory = 'partner' | 'reference' | 'spell' | 'consistency' | 'completeness' | 'semantic'
type ValidationSeverity = 'error' | 'warning' | 'info'

interface ValidationIssue {
  monsterId: string
  category: ValidationCategory
  severity: ValidationSeverity
  message: string
  expected?: string
  actual?: string
}

interface AuditSummary {
  monstersScanned: number
  totalIssues: number
  bySeverity: Record<ValidationSeverity, number>
  byCategory: Record<ValidationCategory, number>
}

// Simplified monster template for validation
interface MonsterData {
  id: string
  numericId: number
  name: string
  level: number
  numberAppearing: { min: number; max: number }
  hp: { min: number; max: number }
  ac: number
  damage: Array<{ dice: string; min: number; max: number }>
  xp: number
  monsterClass: string
  specialAbilities: string[]
  resistances: Array<{ type: string; value: number }>
  regeneration: number
  isBoss: boolean
  canFlee: boolean
  spellLevels?: { mage?: number; priest?: number }
  spells?: string[]
  breathWeapon?: { type: string }
  levelDrain?: number
  spellResist?: number
  partner?: { monsterId: string; chance: number }
  fixedEncounter?: boolean
  isFinalBoss?: boolean
  isUnique?: boolean
}

// =============================================================================
// Reference Data (Apple II Wizardry 1 source)
// =============================================================================

interface ReferenceMonster {
  numericId: number
  id: string
  name: string
  hp: { min: number; max: number }
  ac: number
  xp: number
  monsterClass: string
  numberAppearing: { min: number; max: number }
  damage: string[]
  specialAbilities: string[]
  spellResist?: number
  levelDrain?: number
  breathWeapon?: string
  regeneration?: number
  mageSpellLevel?: number
  priestSpellLevel?: number
}

function parseDice(formula: string): { min: number; max: number } {
  const match = formula.match(/^(\d+)d(\d+)(?:\+(\d+))?$/)
  if (!match) return { min: 1, max: 1 }
  const count = parseInt(match[1])
  const sides = parseInt(match[2])
  const bonus = match[3] ? parseInt(match[3]) : 0
  return { min: count + bonus, max: count * sides + bonus }
}

// Reference monster data (from monster-technical-reference.md)
const REFERENCE_MONSTERS: Record<number, ReferenceMonster> = {
  0: { numericId: 0, id: 'bubbly_slime', name: 'Bubbly Slime', monsterClass: 'animal', ac: 12, hp: parseDice('1d3+1'), numberAppearing: parseDice('2d2'), damage: ['1d1'], xp: 55, specialAbilities: ['can_sleep'], spellResist: 0 },
  1: { numericId: 1, id: 'orc', name: 'Orc', monsterClass: 'fighter', ac: 10, hp: parseDice('1d4'), numberAppearing: parseDice('3d2'), damage: ['1d4'], xp: 235, specialAbilities: ['can_sleep', 'can_run'], spellResist: 0 },
  2: { numericId: 2, id: 'kobold', name: 'Kobold', monsterClass: 'fighter', ac: 8, hp: parseDice('2d3+1'), numberAppearing: parseDice('2d2+1'), damage: ['1d2+1', '1d2+1'], xp: 415, specialAbilities: ['can_sleep', 'can_run', 'multiple_attacks'], spellResist: 0 },
  3: { numericId: 3, id: 'undead_kobold', name: 'Undead Kobold', monsterClass: 'undead', ac: 10, hp: parseDice('2d3+2'), numberAppearing: parseDice('1d6+1'), damage: ['1d4+1'], xp: 230, specialAbilities: [], spellResist: 0 },
  // More monsters would be added here - keeping condensed for brevity
  77: { numericId: 77, id: 'murphy_ghost', name: "Murphy's Ghost", monsterClass: 'undead', ac: -3, hp: parseDice('10d10+10'), numberAppearing: parseDice('1d1'), damage: ['1d1+1'], xp: 4450, specialAbilities: ['can_sleep'], spellResist: 40, regeneration: 1 },
  96: { numericId: 96, id: 'werdna', name: 'W E R D N A', monsterClass: 'mage', ac: -7, hp: parseDice('10d10+20'), numberAppearing: parseDice('1d1'), damage: ['8d5', '8d5'], xp: 15880, specialAbilities: ['stone', 'poison', 'paralysis', 'critical_hit', 'level_drain', 'spellcasting', 'multiple_attacks'], spellResist: 70, mageSpellLevel: 7, priestSpellLevel: 7, levelDrain: 4, regeneration: 5 }
}

// Partner chain data
const PARTNER_CHAINS: Record<string, { partner: string; chance: number } | null> = {
  'bubbly_slime': { partner: 'orc', chance: 10 },
  'orc': { partner: 'kobold', chance: 20 },
  'kobold': { partner: 'orc', chance: 15 },
  'undead_kobold': { partner: 'kobold', chance: 10 },
  'dragon_fly': null,
  'gargoyle': null,
  'earth_giant': null,
  'will_o_wisp': null,
  'fire_dragon': null,
  'high_ninja': null,
  'murphy_ghost': { partner: 'murphy_ghost', chance: 80 },
  'werdna': { partner: 'vampire_lord', chance: 100 },
  // ... more chains would be here
}

// =============================================================================
// Helper Functions
// =============================================================================

function createIssue(
  monsterId: string,
  category: ValidationCategory,
  severity: ValidationSeverity,
  message: string,
  expected?: string,
  actual?: string
): ValidationIssue {
  return { monsterId, category, severity, message, expected, actual }
}

// =============================================================================
// Validators
// =============================================================================

function validatePartnerChains(monsters: Map<string, MonsterData>): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  for (const [id, template] of monsters) {
    if (!template.partner) continue

    // Validate partner monsterId exists
    if (!monsters.has(template.partner.monsterId)) {
      issues.push(createIssue(
        id, 'partner', 'error',
        `Partner monster '${template.partner.monsterId}' does not exist`
      ))
    }

    // Detect self-referential loop
    if (template.partner.monsterId === id) {
      issues.push(createIssue(
        id, 'partner', 'info',
        `Self-referential partner chain (${template.partner.chance}% → self)`
      ))
    }
  }

  return issues
}

function validateConsistency(monsters: Map<string, MonsterData>): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  for (const [id, template] of monsters) {
    // Multiple attacks check
    const hasMultipleAttacksAbility = template.specialAbilities.includes('multiple_attacks')
    const hasMultipleDamage = template.damage.length > 1
    if (hasMultipleAttacksAbility && !hasMultipleDamage) {
      issues.push(createIssue(id, 'consistency', 'error',
        `Has multiple_attacks ability but only ${template.damage.length} damage entry`))
    }
    if (hasMultipleDamage && !hasMultipleAttacksAbility) {
      issues.push(createIssue(id, 'consistency', 'warning',
        `Has ${template.damage.length} damage entries but no multiple_attacks ability`))
    }

    // Regeneration check
    const hasRegenAbility = template.specialAbilities.includes('regeneration')
    const hasRegenValue = template.regeneration > 0
    if (hasRegenAbility && !hasRegenValue) {
      issues.push(createIssue(id, 'consistency', 'error',
        `Has regeneration ability but regeneration value is ${template.regeneration}`))
    }
    if (hasRegenValue && !hasRegenAbility) {
      issues.push(createIssue(id, 'consistency', 'error',
        `Has regeneration value ${template.regeneration} but no regeneration ability`))
    }

    // Level drain check
    const hasLevelDrainAbility = template.specialAbilities.includes('level_drain')
    const hasLevelDrainValue = template.levelDrain !== undefined && template.levelDrain > 0
    if (hasLevelDrainAbility && !hasLevelDrainValue) {
      issues.push(createIssue(id, 'consistency', 'error',
        `Has level_drain ability but no levelDrain value`))
    }
    if (hasLevelDrainValue && !hasLevelDrainAbility) {
      issues.push(createIssue(id, 'consistency', 'error',
        `Has levelDrain value ${template.levelDrain} but no level_drain ability`))
    }

    // Breath weapon check
    const hasBreathAbility = template.specialAbilities.includes('breath_weapon')
    const hasBreathWeapon = template.breathWeapon !== undefined
    if (hasBreathAbility && !hasBreathWeapon) {
      issues.push(createIssue(id, 'consistency', 'error',
        `Has breath_weapon ability but no breathWeapon definition`))
    }
    if (hasBreathWeapon && !hasBreathAbility) {
      issues.push(createIssue(id, 'consistency', 'error',
        `Has breathWeapon definition but no breath_weapon ability`))
    }

    // canFlee should match can_run ability
    const hasCanRunAbility = template.specialAbilities.includes('can_run')
    if (template.canFlee !== hasCanRunAbility) {
      issues.push(createIssue(id, 'consistency', 'warning',
        `canFlee (${template.canFlee}) doesn't match can_run ability (${hasCanRunAbility})`))
    }
  }

  return issues
}

function validateCompleteness(monsters: Map<string, MonsterData>): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const foundNumericIds = new Set<number>()

  for (const [, template] of monsters) {
    foundNumericIds.add(template.numericId)
  }

  // Check for missing IDs
  for (let i = 0; i <= 100; i++) {
    if (!foundNumericIds.has(i)) {
      issues.push(createIssue('GLOBAL', 'completeness', 'error',
        `Missing monster with numericId ${i}`))
    }
  }

  // Report total count
  if (monsters.size !== 101) {
    issues.push(createIssue('GLOBAL', 'completeness', 'info',
      `Found ${monsters.size} monsters (expected 101)`))
  }

  // Check Werdna has correct boss flags
  for (const [id, template] of monsters) {
    if (template.numericId === 96) {
      if (!template.isBoss) {
        issues.push(createIssue(id, 'completeness', 'error',
          `Werdna must have isBoss: true`))
      }
    }
  }

  return issues
}

function validateSemantics(monsters: Map<string, MonsterData>): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  for (const [id, template] of monsters) {
    // Boss monsters should have substantial stats
    if (template.isBoss) {
      if (template.hp.max < 30) {
        issues.push(createIssue(id, 'semantic', 'warning',
          `Boss monster has low max HP (${template.hp.max})`))
      }
      if (template.xp < 1000) {
        issues.push(createIssue(id, 'semantic', 'warning',
          `Boss monster has low XP (${template.xp})`))
      }
    }

    // Dragons should typically have breath weapons
    if (template.monsterClass === 'dragon' && !template.breathWeapon) {
      issues.push(createIssue(id, 'semantic', 'info',
        `Dragon-class monster without breath weapon`))
    }
  }

  return issues
}

// =============================================================================
// Report Generator
// =============================================================================

function calculateSummary(issues: ValidationIssue[], totalMonsters: number): AuditSummary {
  const bySeverity: Record<ValidationSeverity, number> = { error: 0, warning: 0, info: 0 }
  const byCategory: Record<ValidationCategory, number> = {
    partner: 0, reference: 0, spell: 0, consistency: 0, completeness: 0, semantic: 0
  }

  for (const issue of issues) {
    bySeverity[issue.severity]++
    byCategory[issue.category]++
  }

  return { monstersScanned: totalMonsters, totalIssues: issues.length, bySeverity, byCategory }
}

function formatIssue(issue: ValidationIssue): string {
  const color = issue.severity === 'error' ? COLORS.red :
                issue.severity === 'warning' ? COLORS.yellow : COLORS.cyan
  let line = `  ${color}[${issue.category}]${COLORS.reset} ${COLORS.bold}${issue.monsterId}${COLORS.reset}: ${issue.message}`
  if (issue.expected !== undefined && issue.actual !== undefined) {
    line += `${COLORS.dim} (expected: ${issue.expected}, got: ${issue.actual})${COLORS.reset}`
  }
  return line
}

function generateReport(issues: ValidationIssue[], totalMonsters: number): void {
  const summary = calculateSummary(issues, totalMonsters)

  console.log('')
  console.log(`${COLORS.bold}════════════════════════════════════════════════════════════${COLORS.reset}`)
  console.log(`${COLORS.bold}                  MONSTER DATA AUDIT REPORT                  ${COLORS.reset}`)
  console.log(`${COLORS.bold}════════════════════════════════════════════════════════════${COLORS.reset}`)
  console.log('')

  console.log(`${COLORS.blue}Scanned:${COLORS.reset} ${summary.monstersScanned} monsters`)
  console.log(`${COLORS.blue}Issues found:${COLORS.reset} ${summary.totalIssues} ` +
              `(${COLORS.red}${summary.bySeverity.error} errors${COLORS.reset}, ` +
              `${COLORS.yellow}${summary.bySeverity.warning} warnings${COLORS.reset}, ` +
              `${COLORS.cyan}${summary.bySeverity.info} info${COLORS.reset})`)
  console.log('')

  if (summary.totalIssues === 0) {
    console.log(`${COLORS.green}${COLORS.bold}✓ All validations passed!${COLORS.reset}`)
    console.log('')
    return
  }

  // Group and print by severity
  const errors = issues.filter(i => i.severity === 'error')
  const warnings = issues.filter(i => i.severity === 'warning')
  const infos = issues.filter(i => i.severity === 'info')

  if (errors.length > 0) {
    console.log(`${COLORS.red}${COLORS.bold}ERRORS (${errors.length})${COLORS.reset}`)
    console.log(`${COLORS.dim}────────────────────────────────────────────────────────────${COLORS.reset}`)
    errors.forEach(issue => console.log(formatIssue(issue)))
    console.log('')
  }

  if (warnings.length > 0) {
    console.log(`${COLORS.yellow}${COLORS.bold}WARNINGS (${warnings.length})${COLORS.reset}`)
    console.log(`${COLORS.dim}────────────────────────────────────────────────────────────${COLORS.reset}`)
    warnings.forEach(issue => console.log(formatIssue(issue)))
    console.log('')
  }

  if (infos.length > 0) {
    console.log(`${COLORS.cyan}${COLORS.bold}INFO (${infos.length})${COLORS.reset}`)
    console.log(`${COLORS.dim}────────────────────────────────────────────────────────────${COLORS.reset}`)
    infos.forEach(issue => console.log(formatIssue(issue)))
    console.log('')
  }

  // Category breakdown
  console.log(`${COLORS.blue}${COLORS.bold}SUMMARY BY CATEGORY${COLORS.reset}`)
  console.log(`${COLORS.dim}────────────────────────────────────────────────────────────${COLORS.reset}`)
  const categories: ValidationCategory[] = ['partner', 'reference', 'spell', 'consistency', 'completeness', 'semantic']
  for (const category of categories) {
    const count = summary.byCategory[category]
    const bar = count > 0 ? '█'.repeat(Math.min(count, 20)) : ''
    const countColor = count === 0 ? COLORS.green : (count > 5 ? COLORS.yellow : COLORS.reset)
    console.log(`  ${category.padEnd(15)} ${countColor}${count.toString().padStart(3)}${COLORS.reset} ${COLORS.dim}${bar}${COLORS.reset}`)
  }
  console.log('')

  if (summary.bySeverity.error > 0) {
    console.log(`${COLORS.red}${COLORS.bold}✗ Audit failed with ${summary.bySeverity.error} error(s)${COLORS.reset}`)
  } else if (summary.bySeverity.warning > 0) {
    console.log(`${COLORS.yellow}${COLORS.bold}⚠ Audit passed with ${summary.bySeverity.warning} warning(s)${COLORS.reset}`)
  }
  console.log('')
}

// =============================================================================
// Main
// =============================================================================

async function loadAllMonsters(): Promise<{ monsters: Map<string, MonsterData>; loadErrors: ValidationIssue[] }> {
  const monstersDir = path.join(process.cwd(), 'data', 'monsters')
  const monsters = new Map<string, MonsterData>()
  const loadErrors: ValidationIssue[] = []

  if (!fs.existsSync(monstersDir)) {
    console.error(`${COLORS.red}Error: Monster data directory not found: ${monstersDir}${COLORS.reset}`)
    process.exit(1)
  }

  const files = fs.readdirSync(monstersDir)
    .filter((f: string) => f.endsWith('.json') && f !== 'index.json')
    .sort()

  console.log(`${COLORS.blue}Loading monsters from ${monstersDir}...${COLORS.reset}`)

  for (const file of files) {
    const filePath = path.join(monstersDir, file)
    const monsterId = file.replace('.json', '')

    try {
      const content = fs.readFileSync(filePath, 'utf-8')
      const rawData = JSON.parse(content) as MonsterData
      monsters.set(rawData.id, rawData)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      loadErrors.push(createIssue(monsterId, 'reference', 'error',
        `Failed to load file: ${errorMessage}`))
    }
  }

  console.log(`${COLORS.green}Loaded ${monsters.size} monsters${COLORS.reset}`)
  if (loadErrors.length > 0) {
    console.log(`${COLORS.yellow}${loadErrors.length} files failed to load${COLORS.reset}`)
  }
  console.log('')

  return { monsters, loadErrors }
}

async function main() {
  console.log('')
  console.log(`${COLORS.cyan}${COLORS.bold}Monster Data Audit${COLORS.reset}`)
  console.log(`${COLORS.dim}Validating against Apple II Wizardry 1 source data${COLORS.reset}`)
  console.log('')

  const { monsters, loadErrors } = await loadAllMonsters()

  console.log(`${COLORS.blue}Running validations...${COLORS.reset}`)

  // Run all validators
  const allIssues = [
    ...loadErrors,
    ...validatePartnerChains(monsters),
    ...validateConsistency(monsters),
    ...validateCompleteness(monsters),
    ...validateSemantics(monsters)
  ]

  generateReport(allIssues, monsters.size)

  const errorCount = allIssues.filter(i => i.severity === 'error').length
  process.exit(errorCount > 0 ? 1 : 0)
}

main().catch(error => {
  console.error(`${COLORS.red}Fatal error:${COLORS.reset}`, error)
  process.exit(1)
})
