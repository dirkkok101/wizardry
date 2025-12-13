import { TypedFormula } from '@validation/spell-schema'

/**
 * Resistance/saving throw info
 */
export interface SpellResistance {
  /** Human-readable formula string (documentation only - code ignores this) */
  formula?: string
  /** Resistance type identifier */
  type?: string
  /** Example calculations for documentation */
  examples?: Record<string, string>
  /** Additional notes */
  notes?: string
  /** TYPED DATA: Code uses this exclusively for calculations */
  typed?: TypedFormula
}

/**
 * Recovery formula for status effects (sleep, paralysis, etc.)
 */
export interface SpellRecovery {
  /** Human-readable formula string (documentation only - code ignores this) */
  formula?: string
  /** Recovery cap as string (e.g., "50%") - documentation only */
  cap?: string
  /** Additional notes */
  notes?: string
  /** TYPED DATA: Code uses this exclusively for calculations */
  typed?: TypedFormula
}

/**
 * Effect container for spells like SOPIC
 */
export interface SpellEffect {
  acModifier?: number
  type?: string
  noSavingThrow?: boolean
  /** MABADI - HP reduced to dice roll result */
  remainingHP?: { dice: string }
  stacks?: boolean | {
    withSelf?: boolean
    withOthers?: boolean
    notes?: string
  }
}

/**
 * Instant death effect configuration
 */
export interface InstantDeathEffect {
  type?: string
  savingThrow?: boolean
  noSavingThrow?: boolean
  killThreshold?: {
    maxHitDice?: number
  }
}

/**
 * Unified spell definition schema
 * Combines fields from JSON files and runtime TypeScript needs
 *
 * Updated to align with ValidatedSpell from spell-schema.ts
 */
export interface SpellDefinition {
  // Identity
  id: string
  name: string
  translation?: string
  level: 1 | 2 | 3 | 4 | 5 | 6 | 7

  // Type fields (resolves conflict between JSON and TS)
  casterType: 'mage' | 'priest'  // Was "type" in TypeScript (which class can cast)
  category: 'offensive' | 'healing' | 'utility' | 'buff' | 'debuff' |
            'resurrection' | 'transformation' | 'instant_death' | 'support'

  // Targeting
  target: 'single' | 'group' | 'all_enemies' | 'all_allies' | 'self' |
          'dead_body' | 'ashes' | 'party' | 'caster' | 'dead_ally' |
          'variable' | 'varies' | 'random' | 'dead_or_ashed_ally'

  // Context
  castableIn: Array<'combat' | 'dungeon' | 'town' | 'camp' | 'maze' | 'inspection' | 'looting'>
  notCastableIn?: string[]

  // Damage
  damage?: {
    dice: string  // "1d8", "3d6", etc.
    type: 'fire' | 'cold' | 'lightning' | 'holy' | 'air' | 'magic' | 'physical' |
          'force' | 'drain' | 'divine' | 'spirit' | 'non-elemental'
    min?: number
    max?: number
    average?: number
    notes?: string
  }

  // Healing
  healing?: {
    dice?: string  // "1d8" or undefined for full heal
    type?: 'normal' | 'full'  // 'full' for MALIKTO
    min?: number
    max?: number
    average?: number
  }

  // AC Modification (PORFIC, MATU, etc.)
  acModifier?: number  // Negative = better defense
  acBonus?: number     // Legacy field, deprecated
  /** Duration of buff effects: 'combat' (single battle) or 'expedition' (until leaving dungeon) */
  buffDuration?: 'combat' | 'expedition'

  // Status Effects
  statusEffect?: 'ASLEEP' | 'BLIND' | 'SILENCED' | 'INVISIBLE' | 'PARALYZED' | 'POISONED' |
                 'asleep' | 'blind' | 'silenced' | 'invisible' | 'paralyzed' | 'poisoned' |
                 'afraid' | 'stoned' | {
                   type: string
                   criticalMechanic?: string
                 }

  // Special Effects (boolean flags or objects with details)
  instantDeath?: boolean | InstantDeathEffect
  resurrection?: boolean | {
    worksOn?: string[]
    doesNotWorkOn?: string[]
    successFormula?: string
    successExamples?: Record<string, string>
    onSuccess?: Record<string, unknown>
    onFailure?: Record<string, unknown>
    criticalWarning?: string
    typed?: TypedFormula
  }
  resurrectionSuccessRate?: number  // 0.50 for KADORTO, 0.90 for DI
  dispelMagic?: boolean  // ZILWAN
  transformation?: boolean  // HAMAN, MAHAMAN
  undeadOnly?: boolean  // BADIOS
  ignoresAC?: boolean  // LAKANITO

  // Utility Effects
  utility?: 'reveal_stats' | 'identify_foe' | 'identify_trap' | 'extended_light' |
            'locate_person' | 'teleport' | 'recall' | 'show_coordinates'

  // Success Rates
  teleportSuccessRate?: number  // MALOR: 0.75
  recallSuccessRate?: 'level_based'  // LOKTOFEIT: level * 2%, max 95%

  // Status Cure
  statusCure?: 'poison' | 'paralysis' | 'silence' | 'blind' | 'asleep' | 'all'

  // Description
  description: string

  // Failure (from JSON)
  failureResult?: string  // What happens on failure

  // New fields from ValidatedSpell
  duration?: string | Record<string, unknown>
  resistance?: SpellResistance
  effect?: SpellEffect
  requirements?: {
    minCasterLevel?: number
  }
  cost?: {
    experienceLevels?: number
    mustRelearn?: boolean
    notes?: string
  }
  randomEffects?: Record<string, unknown>[]
  risks?: Record<string, unknown>
  notes?: string
  recovery?: SpellRecovery
  escape?: {
    destination?: string
    successFormula?: string
    successExamples?: Record<string, string>
    /** Consequences of successful escape (LOKTOFEIT strips equipment/gold) */
    onSuccess?: {
      equipmentLost?: boolean
      goldLostPercent?: number
    }
    onFailure?: Record<string, unknown>
    typed?: TypedFormula
  }
  comparison?: string
  bugFix?: boolean
  stacking?: boolean
  immunities?: string[]

  // MALOR teleport behaviors
  campBehavior?: {
    type?: string
    dangers?: Record<string, string>
    restrictions?: Record<string, string>
  }
  combatBehavior?: {
    type?: string
    destination?: string
    safe?: boolean
  }
}

/**
 * Runtime spell data after loading and validation
 * This is what SpellCastingService will use
 */
export interface LoadedSpell extends SpellDefinition {
  loaded: true  // Marker that this came from JSON
  validatedAt: number  // Timestamp
}
