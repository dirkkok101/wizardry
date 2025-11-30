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
 * Damage formula pattern (e.g., "1d6", "2d8", "3d6")
 */
const DamageFormulaSchema = z.string().regex(
  /^\d+d\d+$/,
  'Damage formula must be in format "XdY" (e.g., "1d6", "2d8")'
)

/**
 * Main trap schema for validating trap JSON files
 */
export const TrapSchema = z.object({
  id: z.string().min(1, 'Trap ID is required'),
  name: z.string().min(1, 'Trap name is required'),
  targetMode: TrapTargetModeSchema,
  targetClasses: z.array(CharacterClassSchema).optional(),
  damageFormula: DamageFormulaSchema.optional(),
  statusEffect: CharacterStatusSchema.optional(),
  specialEffect: TrapSpecialEffectSchema.optional(),
  hitChance: z.number().min(0).max(1).optional(),
  description: z.string().min(1, 'Description is required')
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
    // Non-special traps should have damage or status effect
    if (data.targetMode !== 'special' && !data.damageFormula && !data.statusEffect) {
      return false
    }
    return true
  },
  { message: 'Non-special traps must have damageFormula or statusEffect' }
)

/**
 * TypeScript type inferred from TrapSchema
 * Represents the validated JSON format loaded from data/traps/*.json
 */
export type ValidatedTrap = z.infer<typeof TrapSchema>

/**
 * Export individual schemas for testing
 */
export const TrapSchemas = {
  TrapTargetMode: TrapTargetModeSchema,
  TrapSpecialEffect: TrapSpecialEffectSchema,
  CharacterClass: CharacterClassSchema,
  CharacterStatus: CharacterStatusSchema,
  DamageFormula: DamageFormulaSchema
}
