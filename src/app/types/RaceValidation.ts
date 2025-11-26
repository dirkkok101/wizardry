import { z } from 'zod'

/**
 * Zod validation schema for Wizardry 1 race data
 *
 * Validated against source material:
 * - Data Driven Gamer (datadrivengamer.blogspot.com)
 * - Strategy Wiki (strategywiki.org)
 * - Zimlab calculations (zimlab.com)
 *
 * Last validated: 2025-11-23
 */

/**
 * Base stat ranges from original Wizardry 1
 * - Minimum: 5 (Hobbit STR, Human PIE)
 * - Maximum: 15 (Hobbit LUC)
 */
const RaceBaseStatsSchema = z.object({
  str: z.number().int().min(5).max(15),
  int: z.number().int().min(5).max(15),
  pie: z.number().int().min(5).max(15),
  vit: z.number().int().min(5).max(15),
  agi: z.number().int().min(5).max(15),
  luc: z.number().int().min(5).max(15)
})

/**
 * Saving throw bonuses (negative modifiers - lower is better)
 * From original Wizardry 1 saving throw formula:
 * Save% = (CharacterLevel/5 + Luck/6 - ClassBonus - RaceBonus) * 5%
 *
 * Validated bonuses:
 * - Human: -1 to death saves (poison, paralysis, critical hits)
 * - Elf: -2 to wand saves (unused in game, but present in code)
 * - Dwarf: -4 to breath saves (breath attacks, gas traps)
 * - Gnome: -2 to petrify saves (petrification attacks)
 * - Hobbit: -3 to spell saves (spells, magic attacks)
 */
const SavingThrowBonusSchema = z.object({
  death: z.number().int().min(-10).max(0).optional(),
  wand: z.number().int().min(-10).max(0).optional(),
  breath: z.number().int().min(-10).max(0).optional(),
  petrify: z.number().int().min(-10).max(0).optional(),
  spell: z.number().int().min(-10).max(0).optional()
}).strict()

/**
 * Valid race IDs from original Wizardry 1
 */
const RaceIdSchema = z.enum(['human', 'elf', 'dwarf', 'gnome', 'hobbit'])

/**
 * Valid class IDs that can be referenced in bestClasses
 */
const ClassIdSchema = z.enum([
  'fighter',
  'mage',
  'priest',
  'thief',
  'bishop',
  'samurai',
  'lord',
  'ninja'
])

/**
 * Complete race data structure
 */
export const RaceDataSchema = z.object({
  id: RaceIdSchema,
  name: z.string().min(1),
  baseStats: RaceBaseStatsSchema,
  savingThrowBonus: SavingThrowBonusSchema,
  statTotal: z.number().int().min(46).max(50),
  description: z.string().min(1),
  strengths: z.array(z.string().min(1)).min(1),
  weaknesses: z.array(z.string().min(1)).min(1),
  bestClasses: z.array(ClassIdSchema).min(1)
}).strict()

/**
 * Type inference from schema
 */
export type ValidatedRaceData = z.infer<typeof RaceDataSchema>

/**
 * Expected race data based on source material
 * Used for validation against authoritative sources
 */
export const EXPECTED_RACE_DATA = {
  human: {
    baseStats: { str: 8, int: 8, pie: 5, vit: 8, agi: 8, luc: 9 },
    statTotal: 46,
    savingThrowBonus: { death: -1 }
  },
  elf: {
    baseStats: { str: 7, int: 10, pie: 10, vit: 6, agi: 9, luc: 6 },
    statTotal: 48,
    savingThrowBonus: { wand: -2 }
  },
  dwarf: {
    baseStats: { str: 10, int: 7, pie: 10, vit: 10, agi: 5, luc: 6 },
    statTotal: 48,
    savingThrowBonus: { breath: -4 }
  },
  gnome: {
    baseStats: { str: 7, int: 7, pie: 10, vit: 8, agi: 10, luc: 7 },
    statTotal: 49,
    savingThrowBonus: { petrify: -2 }
  },
  hobbit: {
    baseStats: { str: 5, int: 7, pie: 7, vit: 6, agi: 10, luc: 15 },
    statTotal: 50,
    savingThrowBonus: { spell: -3 }
  }
} as const

/**
 * Validate race data and return validation result
 */
export function validateRaceData(data: unknown): {
  success: boolean
  data?: ValidatedRaceData
  errors?: z.ZodError
} {
  const result = RaceDataSchema.safeParse(data)

  if (result.success) {
    return { success: true, data: result.data }
  } else {
    return { success: false, errors: result.error }
  }
}

/**
 * Validate race data against source material
 * Checks if base stats and saving throw bonuses match expected values
 */
export function validateAgainstSourceMaterial(
  data: ValidatedRaceData
): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []
  const expected = EXPECTED_RACE_DATA[data.id]

  if (!expected) {
    errors.push(`Unknown race ID: ${data.id}`)
    return { valid: false, errors }
  }

  // Validate base stats
  const statsMatch = Object.keys(expected.baseStats).every(stat => {
    const key = stat as keyof typeof expected.baseStats
    return data.baseStats[key] === expected.baseStats[key]
  })

  if (!statsMatch) {
    errors.push(`Base stats do not match source material for ${data.id}`)
    errors.push(`Expected: ${JSON.stringify(expected.baseStats)}`)
    errors.push(`Actual: ${JSON.stringify(data.baseStats)}`)
  }

  // Validate stat total
  const actualTotal = Object.values(data.baseStats).reduce((sum, val) => sum + val, 0)
  if (actualTotal !== data.statTotal) {
    errors.push(`Stat total mismatch: declared ${data.statTotal}, actual ${actualTotal}`)
  }

  if (data.statTotal !== expected.statTotal) {
    errors.push(`Stat total does not match source material: expected ${expected.statTotal}, got ${data.statTotal}`)
  }

  // Validate saving throw bonuses
  const expectedBonusKeys = Object.keys(expected.savingThrowBonus) as Array<keyof typeof expected.savingThrowBonus>
  const actualBonusKeys = Object.keys(data.savingThrowBonus) as Array<keyof typeof data.savingThrowBonus>

  // Check if the correct bonuses are present
  const missingBonuses = expectedBonusKeys.filter(key => !(key in data.savingThrowBonus))
  const extraBonuses = actualBonusKeys.filter(key => !(key in expected.savingThrowBonus))

  if (missingBonuses.length > 0) {
    errors.push(`Missing saving throw bonuses for ${data.id}: ${missingBonuses.join(', ')}`)
  }

  if (extraBonuses.length > 0) {
    errors.push(`Unexpected saving throw bonuses for ${data.id}: ${extraBonuses.join(', ')}`)
  }

  // Check if bonus values match
  expectedBonusKeys.forEach(key => {
    if (data.savingThrowBonus[key] !== expected.savingThrowBonus[key]) {
      errors.push(`Saving throw bonus mismatch for ${data.id}.${key}: expected ${expected.savingThrowBonus[key]}, got ${data.savingThrowBonus[key]}`)
    }
  })

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Validate and load race data with comprehensive error reporting
 */
export function validateAndLoadRaceData(rawData: unknown): {
  success: boolean
  data?: ValidatedRaceData
  schemaErrors?: string[]
  sourceErrors?: string[]
} {
  // First validate schema
  const schemaResult = validateRaceData(rawData)

  if (!schemaResult.success) {
    const errorMessages = schemaResult.errors?.issues.map(e => {
      const path = e.path.length > 0 ? e.path.join('.') + ': ' : ''
      return `${path}${e.message}`
    }) || ['Unknown schema validation error']

    return {
      success: false,
      schemaErrors: errorMessages
    }
  }

  // Then validate against source material
  const sourceResult = validateAgainstSourceMaterial(schemaResult.data!)

  if (!sourceResult.valid) {
    return {
      success: false,
      data: schemaResult.data,
      sourceErrors: sourceResult.errors
    }
  }

  return {
    success: true,
    data: schemaResult.data
  }
}
