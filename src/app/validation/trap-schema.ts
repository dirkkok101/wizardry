import { z } from 'zod'

/**
 * Zod schemas for runtime validation of trap JSON files
 * Ensures loaded traps match TypeScript interfaces and original Wizardry 1 data
 */

/**
 * Character class enum for class-specific traps
 */
const CharacterClassSchema = z.enum([
  'FIGHTER',
  'MAGE',
  'PRIEST',
  'THIEF',
  'BISHOP',
  'SAMURAI',
  'LORD',
  'NINJA'
])

/**
 * Character status effects that traps can apply
 */
const CharacterStatusSchema = z.enum([
  'OK',
  'INJURED',
  'POISONED',
  'PARALYZED',
  'STONED',
  'DEAD',
  'ASHES',
  'LOST'
])

/**
 * Target mode - who the trap affects
 */
const TrapTargetModeSchema = z.enum([
  'opener',        // Only the character opening the chest
  'party',         // Entire party
  'class_specific', // Only specific classes
  'special'        // Special effect (teleport, combat)
])

/**
 * Special effects beyond damage/status
 */
const TrapSpecialEffectSchema = z.enum([
  'teleport',  // TELEPORTER - moves party to random location
  'combat'     // ALARM - triggers monster encounter
])

/**
 * Resistance types for character resistance checks (data-driven)
 * Matches ResistanceType from CharacterResistance.ts
 */
const ResistanceTypeSchema = z.enum([
  // Trap-specific resistances
  'poisonGasTrap',   // Gas Bomb trap
  'antiMageTrap',    // Anti-Mage trap
  'antiPriestTrap',  // Anti-Priest trap
  // Status effect resistances
  'poison',          // Poison status
  'paralysis',       // Paralysis status
  'stoning',         // Petrification
  'silence',         // Silence status
  // Combat resistances
  'critical',        // Critical hits
  'breath'           // Breath attacks
])

/**
 * Effect type categories for trap classification
 *
 * Note: This field categorizes traps for documentation and future extensibility.
 * Current trap routing uses specific fields (damageFormula, statusEffect, specialEffect)
 * rather than effectType. This allows traps to combine multiple effect types
 * (e.g., a trap that deals damage AND applies a status effect).
 */
const TrapEffectTypeSchema = z.enum([
  'damage',      // Primary effect is HP damage (e.g., crossbow_bolt, exploding_box)
  'condition',   // Primary effect is status (e.g., poison_needle, stunner)
  'teleport',    // Primary effect is teleportation (e.g., teleporter)
  'alarm'        // Primary effect is triggering combat (e.g., alarm)
])

/**
 * Reward 2 tiers (10-19) that a trap can appear in
 * Based on authentic Wizardry 1 monster reward values
 */
const TrapTiersSchema = z.array(z.number().int().min(10).max(19)).min(1)

/**
 * Damage formula pattern (e.g., "1d6", "2d8", "3d6")
 * @deprecated Use diceType instead for authentic maze-level scaling
 */
const DamageFormulaSchema = z.string().regex(
  /^\d+d\d+$/,
  'Damage formula must be in format "XdY" (e.g., "1d6", "2d8")'
)

/**
 * Dice type for damage calculation (e.g., 6 for d6, 8 for d8, 12 for d12)
 * Authentic Wizardry 1: damage = (mazeLevel)d{diceType}
 */
const DiceTypeSchema = z.number().int().min(4).max(20)

/**
 * Main trap schema for validating trap JSON files
 */
export const TrapSchema = z.object({
  id: z.string().min(1, 'Trap ID is required'),
  name: z.string().min(1, 'Trap name is required'),
  effectType: TrapEffectTypeSchema,
  tiers: TrapTiersSchema,
  targetMode: TrapTargetModeSchema,
  targetClasses: z.array(CharacterClassSchema).optional(),
  primaryTargetClasses: z.array(CharacterClassSchema).optional(),  // Authentic Wizardry 1: primary targets always affected, secondary can save
  damageFormula: DamageFormulaSchema.optional(),  // @deprecated - use diceType
  diceType: DiceTypeSchema.optional(),            // Preferred: dice type for maze-level scaling
  statusEffect: CharacterStatusSchema.optional(),
  specialEffect: TrapSpecialEffectSchema.optional(),
  hitChance: z.number().min(0).max(1).optional(),
  description: z.string().min(1, 'Description is required'),
  resistanceType: ResistanceTypeSchema.optional()  // Data-driven resistance type for character checks
}).refine(
  data => {
    // class_specific traps must have targetClasses
    if (data.targetMode === 'class_specific' && (!data.targetClasses || data.targetClasses.length === 0)) {
      return false
    }
    return true
  },
  { message: 'class_specific traps must have targetClasses array' }
).refine(
  data => {
    // special traps must have specialEffect
    if (data.targetMode === 'special' && !data.specialEffect) {
      return false
    }
    return true
  },
  { message: 'special traps must have specialEffect' }
).refine(
  data => {
    // Non-special traps should have damage (diceType or damageFormula) or status effect
    if (data.targetMode !== 'special' && !data.diceType && !data.damageFormula && !data.statusEffect) {
      return false
    }
    return true
  },
  { message: 'Non-special traps must have diceType, damageFormula, or statusEffect' }
)

/**
 * TypeScript type inferred from TrapSchema
 * Represents the validated JSON format loaded from data/traps/*.json
 */
export type ValidatedTrap = z.infer<typeof TrapSchema>

/**
 * TypeScript types inferred from schemas
 */
export type TrapEffectType = z.infer<typeof TrapEffectTypeSchema>

/**
 * Export individual schemas for testing
 */
export const TrapSchemas = {
  TrapTargetMode: TrapTargetModeSchema,
  TrapSpecialEffect: TrapSpecialEffectSchema,
  TrapEffectType: TrapEffectTypeSchema,
  TrapTiers: TrapTiersSchema,
  CharacterClass: CharacterClassSchema,
  CharacterStatus: CharacterStatusSchema,
  DamageFormula: DamageFormulaSchema,
  DiceType: DiceTypeSchema,
  ResistanceType: ResistanceTypeSchema
}
