import { z } from 'zod'

/**
 * Zod validation schemas for character class JSON files
 *
 * These schemas ensure that class data files in data/classes/*.json
 * conform to the correct structure and contain valid values.
 *
 * Based on validation against source material (docs/research/class-json-validation-report.md)
 */

/**
 * Valid stat requirement keys
 */
const statKeys = ['str', 'int', 'pie', 'vit', 'agi', 'luc'] as const

/**
 * Stat requirements schema
 * All stats are optional, but if present must be >= 3 and <= 18
 */
export const ClassRequirementsSchema = z.object({
  str: z.number().int().min(3).max(18).optional(),
  int: z.number().int().min(3).max(18).optional(),
  pie: z.number().int().min(3).max(18).optional(),
  vit: z.number().int().min(3).max(18).optional(),
  agi: z.number().int().min(3).max(18).optional(),
  luc: z.number().int().min(3).max(18).optional()
}).strict()

/**
 * Valid alignment values
 */
export const AlignmentSchema = z.enum(['good', 'neutral', 'evil'])

/**
 * Equipment restrictions schema
 */
export const EquipmentRestrictionsSchema = z.object({
  weapons: z.array(z.string()).min(1),
  armor: z.array(z.string()).min(1),
  shields: z.array(z.string()),
  helmets: z.array(z.string())
}).strict()

/**
 * Spell access definition for mage or priest spells
 */
const SpellTypeAccessSchema = z.object({
  minLevel: z.number().int().min(1).max(13),
  maxLevel: z.number().int().min(1).max(7)
}).strict()

/**
 * Spell access schema (can have mage, priest, or both)
 */
export const SpellAccessSchema = z.object({
  mage: SpellTypeAccessSchema.optional(),
  priest: SpellTypeAccessSchema.optional()
}).strict().nullable()

/**
 * Valid hit dice notation
 */
export const HitDiceSchema = z.enum(['1d4', '1d6', '1d8', '1d10'])

/**
 * Attacks per level schema
 * Keys must be valid range notation like "1-4", "5-9", "10+", "1+"
 * Values must be positive integers
 */
export const AttacksPerLevelSchema = z.record(
  z.string().regex(/^(\d+-\d+|\d+\+)$/),
  z.number().int().min(1).max(10)
)

/**
 * XP table schema
 * Must have exactly 11 entries (for levels 2-13)
 * Each value must be a positive integer
 * Values should be in ascending order
 */
export const XPTableSchema = z.array(z.number().int().positive())
  .length(11)
  .refine(
    (arr) => {
      for (let i = 1; i < arr.length; i++) {
        if (arr[i] <= arr[i - 1]) {
          return false
        }
      }
      return true
    },
    { message: 'XP table values must be in ascending order' }
  )

/**
 * Complete class data schema
 */
export const ClassDataSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  requirements: ClassRequirementsSchema,
  alignmentRestrictions: z.array(AlignmentSchema),
  equipmentRestrictions: EquipmentRestrictionsSchema,
  hitDice: HitDiceSchema,
  spellAccess: SpellAccessSchema,
  attacksPerLevel: AttacksPerLevelSchema,
  xpTable: XPTableSchema,
  specialAbilities: z.array(z.string()),
  canIdentifyItems: z.boolean(),
  canDispelUndead: z.boolean(),
  canCriticalHit: z.boolean()
}).strict()

/**
 * Validate a class JSON object
 * @throws ZodError if validation fails
 */
export function validateClassData(data: unknown): z.infer<typeof ClassDataSchema> {
  return ClassDataSchema.parse(data)
}

/**
 * Safely validate class JSON and return result
 */
export function safeValidateClassData(data: unknown): {
  success: boolean
  data?: z.infer<typeof ClassDataSchema>
  error?: z.ZodError
} {
  const result = ClassDataSchema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  } else {
    return { success: false, error: result.error }
  }
}

/**
 * Type guard to check if data is valid ClassData
 */
export function isValidClassData(data: unknown): data is z.infer<typeof ClassDataSchema> {
  return ClassDataSchema.safeParse(data).success
}
