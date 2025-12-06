// src/validation/MonsterSchema.ts
import { z } from 'zod'

/**
 * Zod schema for validating monster JSON data
 * Based on docs/data-format/monsters-json.md and docs/research/monster-reference.md
 */

const DiceRollSchema = z.object({
  dice: z.string().regex(/^\d+d\d+(\+\d+)?$/, 'Dice must be in format "NdM" or "NdM+X" (e.g., "1d8", "3d6+2")'),
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
  type: z.enum([
    'physical', // Half damage from Lorto, Malikto, Molito, Tiltowait
    'fire',     // Half damage from Litokan, Mahalito, Lahalito
    'cold',     // Half damage from Dalto, Madalto
    'magic',    // Purpose weapon bonus ONLY (e.g., Mage Masher vs mages)
                // NOTE: For flat spell resistance %, use the spellResist field instead
    'poison',   // Resistance to poison status effect
    'drain',    // Resistance to level drain attacks
    'stone'     // Resistance to petrification
  ]),
  value: z.number().int().min(0).max(100)
})

const BreathWeaponSchema = z.object({
  type: z.enum([
    'fire',    // Fire breath (Dragon Fly, Chimera, Fire Dragon)
    'cold',    // Cold breath (Dragon Puppy, Flack)
    'poison',  // Poison breath (Gas Dragon, Poison Giant)
    'stone',   // Stone breath (Gorgon) - does damage only, not petrify
    'drain'    // Drain breath (Dragon Zombie, Creeping Coin)
  ])
  // Note: Breath damage is ALWAYS CurrentHP ÷ 2, dealt to ALL party members
  // Save vs. Breath = half damage, Elemental protection = half damage
  // Both = quarter damage
})

const LocationSchema = z.object({
  level: z.number().int().min(1).max(10),
  x: z.number().int().min(0).max(19),
  y: z.number().int().min(0).max(19)
})

/**
 * Partner chain schema for encounter generation
 * Per Apple II source: each monster has a % chance to spawn partner groups
 * Chain continues until: partner check fails, max 4 groups, or loop detected
 */
const PartnerSchema = z.object({
  monsterId: z.string().min(1),  // ID of partner monster to spawn
  chance: z.number().int().min(0).max(100)  // % chance to spawn partner group
})

const SpellLevelsSchema = z.object({
  mage: z.number().int().min(0).max(7).optional(),  // 0 = no mage spells
  priest: z.number().int().min(0).max(7).optional()  // 0 = no priest spells
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
  // Original game monster ID (0-100) for reference/sorting
  numericId: z.number().int().min(0).max(100),
  name: z.string().min(1),
  // Unidentified name shown before Latumapic spell reveals true identity
  // Generic category names like "Man in Armor", "Dragon", "Giant", "Undead", etc.
  unidentifiedName: z.string().min(1),
  level: z.number().int().min(1).max(25), // Max 25 for Maelific (25d4 HP)
  numberAppearing: NumberAppearingSchema,
  hp: HpRangeSchema,
  ac: z.number().int().min(-10).max(20),
  damage: z.array(DiceRollSchema),
  xp: z.number().int().min(0),
  // Monster class from original Wizardry (13 classes)
  // Affects: friendly encounter %, spell targeting, turn undead
  monsterClass: z.enum([
    'fighter',    // 11% friendly - Standard humanoid fighters
    'mage',       // 6% friendly - Spellcaster humanoids
    'priest',     // 16% friendly - Divine casters
    'thief',      // 4% friendly - Rogues
    'giant',      // Never friendly - Large humanoids
    'mythical',   // 1% friendly - Gorgon, Medusalizard
    'dragon',     // 26% friendly - Dragons and dragonkin
    'animal',     // 1% friendly - Beasts and creatures
    'were',       // 1% friendly - Lycanthropes
    'undead',     // 1% friendly - Makanito immune, Dispell target
    'demon',      // 1% friendly - High spell resist
    'insect',     // 1% friendly - Spiders, beetles
    'enchanted'   // 1% friendly - Magical creatures
  ]),
  specialAbilities: z.array(z.enum([
    // Combat abilities
    'spellcasting',           // Can cast spells (requires spellLevels)
    'breath_weapon',          // Breath attack (requires breathWeapon)
    'multiple_attacks',       // Has multiple damage rolls
    'critical_hit',           // Can instant-kill (level×2% chance, max 50%)
    'decapitate',             // Ninja-style instant kill

    // Status infliction
    'poison',                 // Can poison targets
    'paralyze',               // Can paralyze targets
    'petrify',                // Can turn to stone
    'level_drain',            // Drains character levels (requires levelDrain)

    // Defensive
    'regeneration',           // Heals HP per round (requires regeneration > 0)
    'magic_resistance',       // Flat % spell resistance (requires spellResist)

    // Behavioral (for service logic)
    'can_sleep',              // Can be affected by Katino
    'can_run',                // Can flee when demoralized
    'call_help'               // Can summon reinforcements mid-combat
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
  // Flat % chance to resist damage spells (separate from elemental resistance)
  // Affected spells: Badios, Badial, Badialma, Litokan, Lorto, Malikto,
  // Halito, Mahalito, Molito, Dalto, Lahalito, Madalto, Zilwan, Tiltowait
  spellResist: z.number().int().min(0).max(100).optional(),

  // Combat positioning (optional - inferred from abilities if not specified)
  attackRange: AttackRangeSchema.optional(),
  prefersBack: z.boolean().optional(),

  // Partner chain for encounter generation (per Apple II source)
  // When this monster spawns, there's a % chance to also spawn partner group
  partner: PartnerSchema.optional()
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
