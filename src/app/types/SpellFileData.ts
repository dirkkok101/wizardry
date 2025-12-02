import { TypedFormula } from '@validation/spell-schema'

/**
 * Spell JSON file format
 * Supports multi-level spells (e.g., BADI at levels 5 and 6)
 * Shared metadata at top level, level-specific data in `levels` array
 */

/**
 * Level-specific spell data
 * Contains all fields that vary between spell levels
 */
export interface SpellLevelData {
  // Identity
  level: 1 | 2 | 3 | 4 | 5 | 6 | 7
  id: string  // "badi", "badi_6", etc.
  description: string

  // Targeting
  target: 'single' | 'group' | 'all_enemies' | 'all_allies' | 'self' | 'dead_body' | 'ashes' | 'party'

  // Damage
  damage?: {
    dice: string  // "1d8", "3d6", etc.
    type: 'fire' | 'cold' | 'lightning' | 'holy' | 'air' | 'magic' | 'physical'
  }

  // Healing
  healing?: {
    dice?: string  // "1d8" or undefined for full heal
    type: 'normal' | 'full'
  }

  // Effects (for instant death, petrification, etc.)
  effect?: {
    type: 'instant_death' | 'petrification' | 'transformation' | 'dispel' | 'fear' | 'sleep' | 'silence' | 'blind' | 'invisible' | 'paralysis' | 'hp_reduction' | 'identify_monsters'
    power?: string  // Optional power level descriptor
    noSavingThrow?: boolean  // MABADI - cannot be resisted
    remainingHP?: { dice: string }  // MABADI - HP reduced to dice roll result
  }

  // AC Modification (PORFIC, MATU, etc.)
  acModifier?: number  // Negative = better defense

  // Status Effects
  statusEffect?: 'ASLEEP' | 'BLIND' | 'SILENCED' | 'INVISIBLE' | 'PARALYZED' | 'POISONED'

  // Special Effects (boolean flags)
  instantDeath?: boolean  // MAKANITO, BADI, MABADI
  resurrection?: boolean  // KADORTO, DI
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

  // Failure (from JSON)
  failureResult?: string  // What happens on failure

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

  // HAMAN/MAHAMAN random effects
  randomEffects?: Array<{
    id: number
    name: string
    effect: string
    healDice?: string
    acValue?: number
    durationDice?: string
  }>

  // Cost (experience levels for HAMAN/MAHAMAN)
  cost?: {
    experienceLevels?: number
    mustRelearn?: boolean
    notes?: string
  }

  // Requirements (minimum caster level)
  requirements?: {
    minCasterLevel?: number
  }

  // LOKTOFEIT escape mechanics
  escape?: {
    destination?: string
    onSuccess?: {
      equipmentLost?: boolean
      goldLostPercent?: number
    }
    typed?: TypedFormula
  }

  // Risks for dangerous spells
  risks?: Record<string, unknown>
}

/**
 * Spell file format (what's stored in JSON)
 * Shared metadata at top level, variants in `levels` array
 */
export interface SpellFileData {
  // Shared metadata (same across all levels)
  name: string
  casterType: 'mage' | 'priest'
  category: 'offensive' | 'healing' | 'utility' | 'buff' | 'debuff'
  castableIn: Array<'combat' | 'dungeon' | 'town'>

  // Level-specific variants
  levels: SpellLevelData[]
}
