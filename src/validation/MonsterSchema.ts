// src/validation/MonsterSchema.ts
import { z } from 'zod'

/**
 * Zod schema for validating monster JSON data
 * Based on docs/data-format/monsters-json.md and docs/research/monster-reference.md
 */

const DiceRollSchema = z.object({
  dice: z.string().regex(/^\d+d\d+$/, 'Dice must be in format "NdM" (e.g., "1d8", "3d6")'),
  min: z.number().int().min(1),
  max: z.number().int().min(1)
}).refine(
  data => data.max >= data.min,
  { message: 'max must be >= min' }
)

const NumberAppearingSchema = z.object({
  min: z.number().int().min(1),
  max: z.number().int().min(1)
}).refine(
  data => data.max >= data.min,
  { message: 'max must be >= min' }
)

const HpRangeSchema = z.object({
  min: z.number().int().min(1),
  max: z.number().int().min(1)
}).refine(
  data => data.max >= data.min,
  { message: 'max must be >= min' }
)

const ResistanceSchema = z.object({
  type: z.enum(['fire', 'cold', 'magic', 'poison']),
  value: z.number().int().min(0).max(100)
})

const BreathWeaponSchema = z.object({
  type: z.enum(['fire', 'cold', 'poison', 'petrify']),
  damage: z.string().regex(/^\d+d\d+$/, 'Damage must be in format "NdM"'),
  target: z.enum(['party', 'single'])
})

const LocationSchema = z.object({
  level: z.number().int().min(1).max(10),
  x: z.number().int().min(0).max(19),
  y: z.number().int().min(0).max(19)
})

const SpellLevelsSchema = z.object({
  mage: z.number().int().min(1).max(7).optional(),
  priest: z.number().int().min(1).max(7).optional()
}).refine(
  data => data.mage !== undefined || data.priest !== undefined,
  { message: 'At least one spell type (mage or priest) must be defined' }
)

/**
 * Attack range determines how a monster can attack:
 * - 'melee': Can only attack from front row (must advance if in back)
 * - 'ranged': Can attack from any row (spells, breath, bows)
 * - 'both': Has both melee and ranged options
 */
export const AttackRangeSchema = z.enum(['melee', 'ranged', 'both'])
export type AttackRange = z.infer<typeof AttackRangeSchema>

export const MonsterSchema = z.object({
  // Required fields
  id: z.string().min(1),
  name: z.string().min(1),
  level: z.number().int().min(1).max(10),
  numberAppearing: NumberAppearingSchema,
  hp: HpRangeSchema,
  ac: z.number().int().min(-10).max(20),
  damage: z.array(DiceRollSchema),
  xp: z.number().int().min(0),
  type: z.enum([
    'normal',
    'undead',
    'humanoid',
    'demon',
    'dragon',
    'mythical',
    'werebeast'
  ]),
  class: z.enum([
    'fighter',
    'mage',
    'priest',
    'thief',
    'bishop',
    'samurai',
    'lord',
    'ninja'
  ]).nullable(),
  specialAbilities: z.array(z.enum([
    'spellcasting',
    'breath_weapon',
    'poison',
    'paralyze',
    'petrify',
    'decapitate',
    'level_drain',
    'regeneration',
    'multiple_attacks',
    'summon_reinforcements',
    'magic_resistance'
  ])),
  resistances: z.array(ResistanceSchema),
  regeneration: z.number().int().min(0).max(10),
  isBoss: z.boolean(),
  canFlee: z.boolean(),

  // Optional fields
  gold: z.number().int().min(0).optional(),
  spellLevels: SpellLevelsSchema.optional(),
  spells: z.array(z.string()).optional(),
  breathWeapon: BreathWeaponSchema.optional(),
  isUnique: z.boolean().optional(),
  isFinalBoss: z.boolean().optional(),
  fixedEncounter: z.boolean().optional(),
  location: LocationSchema.optional(),
  dropItems: z.array(z.string()).optional(),
  levelDrain: z.number().int().min(1).max(4).optional(),

  // Combat positioning (optional - inferred from abilities if not specified)
  attackRange: AttackRangeSchema.optional(),
  prefersBack: z.boolean().optional()
}).strict() // Strict mode: reject unknown properties

// Refinements for cross-field validation
.refine(
  data => {
    // If spellcasting ability, must have spellLevels and spells
    if (data.specialAbilities.includes('spellcasting')) {
      return data.spellLevels !== undefined && data.spells !== undefined && data.spells.length > 0
    }
    return true
  },
  { message: 'Monsters with spellcasting ability must have spellLevels and at least one spell' }
)
.refine(
  data => {
    // If breath_weapon ability, must have breathWeapon definition
    if (data.specialAbilities.includes('breath_weapon')) {
      return data.breathWeapon !== undefined
    }
    return true
  },
  { message: 'Monsters with breath_weapon ability must have breathWeapon definition' }
)
.refine(
  data => {
    // If regeneration > 0, must have regeneration in special abilities
    if (data.regeneration > 0) {
      return data.specialAbilities.includes('regeneration')
    }
    return true
  },
  { message: 'Monsters with regeneration > 0 must have regeneration in specialAbilities' }
)
.refine(
  data => {
    // If level_drain ability, must have levelDrain amount
    if (data.specialAbilities.includes('level_drain')) {
      return data.levelDrain !== undefined && data.levelDrain >= 1 && data.levelDrain <= 4
    }
    return true
  },
  { message: 'Monsters with level_drain ability must have levelDrain amount (1-4)' }
)
.refine(
  data => {
    // If fixedEncounter is true, must have location
    if (data.fixedEncounter === true) {
      return data.location !== undefined
    }
    return true
  },
  { message: 'Fixed encounter monsters must have location defined' }
)
.refine(
  data => {
    // Final boss must be unique and a boss
    if (data.isFinalBoss === true) {
      return data.isUnique === true && data.isBoss === true
    }
    return true
  },
  { message: 'Final boss must be both unique and a boss' }
)
.refine(
  data => {
    // Multiple attacks: damage array length should be > 1 if this ability is present
    if (data.specialAbilities.includes('multiple_attacks')) {
      return data.damage.length > 1
    }
    return true
  },
  { message: 'Monsters with multiple_attacks must have more than 1 damage entry' }
)
.refine(
  data => {
    // Magic resistance: if magic_resistance ability, must have magic resistance in resistances array
    if (data.specialAbilities.includes('magic_resistance')) {
      return data.resistances.some(r => r.type === 'magic')
    }
    return true
  },
  { message: 'Monsters with magic_resistance ability must have magic resistance defined' }
)

export type MonsterTemplate = z.infer<typeof MonsterSchema>

/**
 * Validate monster data and return typed result
 * @param data - Raw JSON data to validate
 * @returns Validated and typed monster data
 * @throws ZodError if validation fails
 */
export function validateMonster(data: unknown): MonsterTemplate {
  return MonsterSchema.parse(data)
}

/**
 * Validate monster data and return safe result (no throw)
 * @param data - Raw JSON data to validate
 * @returns Success or error result
 */
export function safeValidateMonster(data: unknown) {
  return MonsterSchema.safeParse(data)
}
