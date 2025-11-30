import { z } from 'zod'

/**
 * Zod schema for runtime validation of spell JSON files
 * Ensures loaded spells match TypeScript interface
 *
 * Updated to match actual spell JSON data structure
 */

// ============================================================================
// Typed Formula Schemas
// ============================================================================
// These schemas define the typed data structures for spell formulas.
// Code ONLY reads these typed fields - string formulas are documentation only.

/**
 * Level-scaled formula: result = base + (multiplier × variable)
 * Used for resistance, recovery, and success rate calculations
 *
 * Examples:
 * - "(20 × Monster Level)%" → { type: 'level_scaled', multiplier: 20, variable: 'monster_level' }
 * - "(50 + 10 × Level)%" → { type: 'level_scaled', base: 50, multiplier: 10, variable: 'monster_level' }
 * - "(Vitality × 4)%" → { type: 'level_scaled', multiplier: 4, variable: 'vitality' }
 */
export const LevelScaledFormulaSchema = z.object({
  type: z.literal('level_scaled'),
  /** Which variable to use: monster_level, caster_level, or vitality */
  variable: z.enum(['monster_level', 'caster_level', 'vitality']),
  /** Multiplier for the variable */
  multiplier: z.number(),
  /** Base value added to result (default 0) */
  base: z.number().default(0),
  /** Maximum result cap (default 100 for percentages) */
  cap: z.number().default(100)
})

/**
 * Fixed percentage formula: constant value
 * Used for success rates like CALFO's 95%
 */
export const FixedFormulaSchema = z.object({
  type: z.literal('fixed'),
  /** Fixed percentage value (0-100) */
  value: z.number().min(0).max(100)
})

/**
 * No resistance/no saving throw
 * Used for MABADI and other spells that can't be resisted
 */
export const NoResistanceFormulaSchema = z.object({
  type: z.literal('none')
})

/**
 * Discriminated union of all typed formula types
 * Use formula.type to narrow the type in code
 */
export const TypedFormulaSchema = z.discriminatedUnion('type', [
  LevelScaledFormulaSchema,
  FixedFormulaSchema,
  NoResistanceFormulaSchema
])

export type TypedFormula = z.infer<typeof TypedFormulaSchema>
export type LevelScaledFormula = z.infer<typeof LevelScaledFormulaSchema>
export type FixedFormula = z.infer<typeof FixedFormulaSchema>
export type NoResistanceFormula = z.infer<typeof NoResistanceFormulaSchema>

// ============================================================================
// Spell Definition Schemas
// ============================================================================

/**
 * Instant death can be a boolean or an object with details
 */
const InstantDeathSchema = z.union([
  z.boolean(),
  z.object({
    type: z.string(),
    savingThrow: z.boolean().optional()
  })
])

/**
 * Damage schema - extended with optional min, max, average, notes
 */
const DamageSchema = z.object({
  dice: z.string(),
  type: z.enum([
    'fire', 'cold', 'lightning', 'holy', 'air', 'magic', 'physical',
    'force', 'drain', 'divine', 'spirit', 'non-elemental'  // All damage types
  ]),
  min: z.number().optional(),
  max: z.number().optional(),
  average: z.number().optional(),
  notes: z.string().optional()
}).optional()

/**
 * Healing schema - extended with optional min, max, average
 */
const HealingSchema = z.object({
  dice: z.string().optional(),
  type: z.enum(['normal', 'full']).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  average: z.number().optional()
}).passthrough().optional()

/**
 * Resistance/saving throw info
 * Contains both human-readable formula string (docs) and typed data (code)
 */
const ResistanceSchema = z.object({
  /** Human-readable formula string (documentation only - code ignores this) */
  formula: z.string().optional(),
  /** Resistance type identifier */
  type: z.string().optional(),
  /** Example calculations for documentation */
  examples: z.record(z.string(), z.string()).optional(),
  /** Additional notes */
  notes: z.string().optional(),
  /** TYPED DATA: Code uses this exclusively for calculations */
  typed: TypedFormulaSchema.optional()
}).passthrough().optional()

/**
 * Recovery formula for status effects (sleep, paralysis, etc.)
 * Contains both human-readable formula string (docs) and typed data (code)
 */
const RecoverySchema = z.object({
  /** Human-readable formula string (documentation only - code ignores this) */
  formula: z.string().optional(),
  /** Recovery cap as string (e.g., "50%") - documentation only */
  cap: z.string().optional(),
  /** Additional notes */
  notes: z.string().optional(),
  /** TYPED DATA: Code uses this exclusively for calculations */
  typed: TypedFormulaSchema.optional()
}).passthrough().optional()

/**
 * Duration can be a simple string or a complex object with timing details
 */
const DurationSchema = z.union([
  z.string(),
  z.object({}).passthrough()  // Objects like { turns: 32000, notes: "..." } or { min: 15, max: 29, unit: "turns" }
]).optional()

/**
 * Effect container for spells like SOPIC
 * stacks can be boolean or object with detailed stacking rules
 */
const EffectSchema = z.object({
  acModifier: z.number().optional(),
  stacks: z.union([
    z.boolean(),
    z.object({}).passthrough()  // Objects like { withSelf: false, withOthers: true, notes: "..." }
  ]).optional()
}).passthrough().optional()

/**
 * Status effect - can be string enum or object with details
 */
const StatusEffectSchema = z.union([
  z.enum(['ASLEEP', 'BLIND', 'SILENCED', 'INVISIBLE', 'PARALYZED', 'POISONED',
          'asleep', 'blind', 'silenced', 'invisible', 'paralyzed', 'poisoned',
          'afraid', 'stoned']),
  z.object({
    type: z.string(),
    criticalMechanic: z.string().optional()
  }).passthrough()
]).optional()

/**
 * Resurrection - can be boolean or detailed object
 * Contains both human-readable formula string (docs) and typed data (code)
 */
const ResurrectionSchema = z.union([
  z.boolean(),
  z.object({
    worksOn: z.array(z.string()).optional(),
    doesNotWorkOn: z.array(z.string()).optional(),
    /** Human-readable formula string (documentation only - code ignores this) */
    successFormula: z.string().optional(),
    /** Example calculations for documentation */
    successExamples: z.record(z.string(), z.string()).optional(),
    onSuccess: z.object({}).passthrough().optional(),
    onFailure: z.object({}).passthrough().optional(),
    criticalWarning: z.string().optional(),
    /** TYPED DATA: Code uses this exclusively for calculations */
    typed: TypedFormulaSchema.optional()
  }).passthrough()
]).optional()

/**
 * Requirements for casting
 */
const RequirementsSchema = z.object({
  minCasterLevel: z.number().optional()
}).passthrough().optional()

/**
 * Cost (e.g., experience levels for HAMAN/MAHAMAN)
 */
const CostSchema = z.object({
  experienceLevels: z.number().optional(),
  mustRelearn: z.boolean().optional(),
  notes: z.string().optional()
}).passthrough().optional()

export const SpellDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  translation: z.string().optional(),
  level: z.union([
    z.literal(1), z.literal(2), z.literal(3), z.literal(4),
    z.literal(5), z.literal(6), z.literal(7)
  ]),
  casterType: z.enum(['mage', 'priest']),
  category: z.enum([
    'offensive', 'healing', 'utility', 'buff', 'debuff',
    'instant_death', 'transformation', 'support', 'resurrection'
  ]),
  target: z.enum([
    'single', 'group', 'all_enemies', 'all_allies', 'self',
    'dead_body', 'ashes', 'party', 'caster', 'dead_ally',
    'variable', 'varies', 'random', 'dead_or_ashed_ally'
  ]),
  castableIn: z.array(z.enum(['combat', 'dungeon', 'town', 'camp', 'maze', 'inspection', 'looting'])),
  notCastableIn: z.array(z.string()).optional(),

  // Optional fields
  damage: DamageSchema,
  healing: HealingSchema,

  acModifier: z.number().optional(),
  acBonus: z.number().optional(),
  statusEffect: StatusEffectSchema,

  instantDeath: InstantDeathSchema.optional(),
  resurrection: ResurrectionSchema,
  resurrectionSuccessRate: z.number().min(0).max(1).optional(),
  dispelMagic: z.boolean().optional(),
  transformation: z.boolean().optional(),
  undeadOnly: z.boolean().optional(),
  ignoresAC: z.boolean().optional(),

  utility: z.enum([
    'reveal_stats', 'identify_foe', 'identify_trap', 'extended_light',
    'locate_person', 'teleport', 'recall', 'show_coordinates'
  ]).optional(),

  teleportSuccessRate: z.number().min(0).max(1).optional(),
  recallSuccessRate: z.literal('level_based').optional(),

  statusCure: z.enum(['poison', 'paralysis', 'silence', 'blind', 'asleep', 'all']).optional(),

  description: z.string(),
  failureResult: z.string().optional(),

  // New optional fields
  duration: DurationSchema,
  resistance: ResistanceSchema,
  effect: EffectSchema,
  requirements: RequirementsSchema,
  cost: CostSchema,
  randomEffects: z.array(z.object({}).passthrough()).optional(),
  risks: z.object({}).passthrough().optional(),
  notes: z.string().optional(),
  /** Status effect recovery formula (sleep, paralysis wake-up chance) */
  recovery: RecoverySchema,
  /** Escape/recall behavior for spells like LOKTOFEIT */
  escape: z.object({
    destination: z.string().optional(),
    /** Human-readable formula string (documentation only - code ignores this) */
    successFormula: z.string().optional(),
    /** Example calculations for documentation */
    successExamples: z.record(z.string(), z.string()).optional(),
    onSuccess: z.object({}).passthrough().optional(),
    onFailure: z.object({}).passthrough().optional(),
    /** TYPED DATA: Code uses this exclusively for calculations */
    typed: TypedFormulaSchema.optional()
  }).passthrough().optional(),
  comparison: z.string().optional(),
  bugFix: z.boolean().optional(),
  stacking: z.boolean().optional()
}).transform((data) => {
  // Migrate legacy acBonus to acModifier
  if (data.acBonus !== undefined && data.acModifier === undefined) {
    console.warn(`Spell ${data.id}: 'acBonus' is deprecated, use 'acModifier' instead`)
    return { ...data, acModifier: data.acBonus, acBonus: undefined }
  }
  return data
})

export type ValidatedSpell = z.infer<typeof SpellDefinitionSchema>
