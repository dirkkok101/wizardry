import { z } from 'zod';

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
const statKeys = ['str', 'int', 'pie', 'vit', 'agi', 'luc'] as const;

/**
 * Stat requirements schema
 * All stats are optional, but if present must be >= 3 and <= 18
 */
export const ClassRequirementsSchema = z
  .object({
    str: z.number().int().min(3).max(18).optional(),
    int: z.number().int().min(3).max(18).optional(),
    pie: z.number().int().min(3).max(18).optional(),
    vit: z.number().int().min(3).max(18).optional(),
    agi: z.number().int().min(3).max(18).optional(),
    luc: z.number().int().min(3).max(18).optional(),
  })
  .strict();

/**
 * Valid alignment values
 */
export const AlignmentSchema = z.enum(['good', 'neutral', 'evil']);

/**
 * Equipment restrictions schema
 */
export const EquipmentRestrictionsSchema = z
  .object({
    weapons: z.array(z.string()).min(1),
    armor: z.array(z.string()).min(1),
    shields: z.array(z.string()),
    helmets: z.array(z.string()),
  })
  .strict();

/**
 * Spell access definition for mage or priest spells
 */
const SpellTypeAccessSchema = z
  .object({
    minLevel: z.number().int().min(1).max(13),
    maxLevel: z.number().int().min(1).max(7),
  })
  .strict();

/**
 * Spell access schema (can have mage, priest, or both)
 */
export const SpellAccessSchema = z
  .object({
    mage: SpellTypeAccessSchema.optional(),
    priest: SpellTypeAccessSchema.optional(),
  })
  .strict()
  .nullable();

/**
 * Valid hit dice notation
 */
export const HitDiceSchema = z.enum(['1d4', '1d6', '1d8', '1d10']);

/**
 * Attacks per level schema - supports two formats:
 * 1. Formula-based: { formula: "(level / 5) + 1", max: 10 }
 * 2. Range-based: { "1-4": 1, "5-9": 2, "10+": 3 }
 */
const AttacksPerLevelFormulaSchema = z.object({
  formula: z.string(),
  max: z.number().int().min(1).max(10),
});

const AttacksPerLevelRangeSchema = z.record(
  z.string().regex(/^(\d+-\d+|\d+\+)$/),
  z.number().int().min(1).max(10),
);

export const AttacksPerLevelSchema = z.union([
  AttacksPerLevelFormulaSchema,
  AttacksPerLevelRangeSchema,
]);

/**
 * XP table schema
 * Must have 11-12 entries (for levels 2-13 or 2-14)
 * Each value must be a positive integer
 * Values should be in ascending order
 */
export const XPTableSchema = z
  .array(z.number().int().positive())
  .min(11)
  .max(12)
  .refine(
    (arr) => {
      for (let i = 1; i < arr.length; i++) {
        if (arr[i] <= arr[i - 1]) {
          return false;
        }
      }
      return true;
    },
    { message: 'XP table values must be in ascending order' },
  );

/**
 * Saving throw bonuses for classes (negative modifiers = better saves)
 */
export const SavingThrowBonusesSchema = z
  .object({
    death: z.number().int().min(-10).max(0).optional(),
    wand: z.number().int().min(-10).max(0).optional(),
    breath: z.number().int().min(-10).max(0).optional(),
    petrify: z.number().int().min(-10).max(0).optional(),
    spell: z.number().int().min(-10).max(0).optional(),
  })
  .strict()
  .optional();

/**
 * Resistances provide percentage-based protection against specific effects
 * Values are percentages (0-100) except 'notes' which is descriptive text
 */
export const ResistancesSchema = z
  .record(z.string(), z.union([z.number().int().min(0).max(100), z.string()]))
  .optional();

/**
 * Spell point formula for caster classes
 * Formula: gain spell point at level (A + B*N) for spell level N
 */
const SpellPointFormulaEntrySchema = z.object({
  A: z.number().int().min(0),
  B: z.number().int().min(1),
});

export const SpellPointFormulaSchema = z
  .object({
    mage: SpellPointFormulaEntrySchema.optional(),
    priest: SpellPointFormulaEntrySchema.optional(),
  })
  .strict()
  .optional();

/**
 * Spell level access - array of levels at which each spell level becomes available
 * Index 0 = spell level 1, Index 6 = spell level 7
 */
export const SpellLevelAccessSchema = z
  .object({
    mage: z.array(z.number().int().min(1)).length(7).optional(),
    priest: z.array(z.number().int().min(1)).length(7).optional(),
  })
  .strict()
  .optional();

/**
 * Trap inspection formula for Thief/Ninja
 */
const TrapInspectionSchema = z
  .object({
    formula: z.string(),
    notes: z.string().optional(),
  })
  .strict()
  .optional();

/**
 * Trap disarm formula for Thief/Ninja
 */
const TrapDisarmSchema = z
  .object({
    formula: z.string(),
    notes: z.string().optional(),
  })
  .strict()
  .optional();

/**
 * Critical hit formula for Ninja
 */
const CriticalHitFormulaSchema = z
  .object({
    chance: z.string(),
    resist: z.string(),
    notes: z.string().optional(),
  })
  .strict()
  .optional();

/**
 * Complete class data schema
 */
export const ClassDataSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    description: z.string().min(1),
    requirements: ClassRequirementsSchema,
    alignmentRestrictions: z.array(AlignmentSchema),
    equipmentRestrictions: EquipmentRestrictionsSchema,
    hitDice: HitDiceSchema,
    hitDiceBonus: z.string().optional(), // Samurai: extra die roll per level
    spellAccess: SpellAccessSchema,
    attacksPerLevel: AttacksPerLevelSchema,
    xpTable: XPTableSchema,
    xpPerLevelAfter13: z.number().int().positive().optional(),
    savingThrowBonuses: SavingThrowBonusesSchema,
    resistances: ResistancesSchema,
    spellPointFormula: SpellPointFormulaSchema,
    spellLevelAccess: SpellLevelAccessSchema,
    specialAbilities: z.array(z.string()),
    canIdentifyItems: z.boolean(),
    canDispelUndead: z.boolean(),
    dispelUndeadPenalty: z.number().int().min(-100).max(0).optional(),
    dispelUndeadMinLevel: z.number().int().min(1).max(13).optional(),
    canCriticalHit: z.boolean(),
    // Class-specific abilities
    nakedACFormula: z.string().optional(), // Ninja: AC bonus when unarmored
    criticalHitFormula: CriticalHitFormulaSchema, // Ninja: decapitation mechanic
    trapInspection: TrapInspectionSchema, // Thief/Ninja: identify trap type
    trapInspectionMultiplier: z.number().int().min(1).max(10).optional(), // AGI multiplier for trap inspection (Thief=6, Ninja=4, others=1)
    trapDisarm: TrapDisarmSchema, // Thief/Ninja: disarm trap chance
    unarmedDamage: z.string().optional(), // Ninja: damage when unarmed
  })
  .strict();

/**
 * Validate a class JSON object
 * @throws ZodError if validation fails
 */
export function validateClassData(data: unknown): z.infer<typeof ClassDataSchema> {
  return ClassDataSchema.parse(data);
}

/**
 * Safely validate class JSON and return result
 */
export function safeValidateClassData(data: unknown): {
  success: boolean;
  data?: z.infer<typeof ClassDataSchema>;
  error?: z.ZodError;
} {
  const result = ClassDataSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, error: result.error };
  }
}

/**
 * Type guard to check if data is valid ClassData
 */
export function isValidClassData(data: unknown): data is z.infer<typeof ClassDataSchema> {
  return ClassDataSchema.safeParse(data).success;
}
