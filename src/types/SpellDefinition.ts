/**
 * Unified spell definition schema
 * Combines fields from JSON files and runtime TypeScript needs
 */
export interface SpellDefinition {
  // Identity
  id: string
  name: string
  level: 1 | 2 | 3 | 4 | 5 | 6 | 7

  // Type fields (resolves conflict between JSON and TS)
  casterType: 'mage' | 'priest'  // Was "type" in TypeScript (which class can cast)
  category: 'offensive' | 'healing' | 'utility' | 'buff' | 'debuff'  // Was "type" in JSON

  // Targeting
  target: 'single' | 'group' | 'all_enemies' | 'all_allies' | 'self' | 'dead_body' | 'ashes'

  // Context
  castableIn: Array<'combat' | 'dungeon' | 'town'>

  // Damage
  damage?: {
    dice: string  // "1d8", "3d6", etc.
    type: 'fire' | 'cold' | 'lightning' | 'holy' | 'air' | 'magic' | 'physical'
  }

  // Healing
  healing?: {
    dice?: string  // "1d8" or undefined for full heal
    type: 'normal' | 'full'  // 'full' for MALIKTO
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

  // Fear Effect
  causeFear?: boolean  // MORLIS

  // Description
  description: string

  // Failure (from JSON)
  failureResult?: string  // What happens on failure
}

/**
 * Runtime spell data after loading and validation
 * This is what SpellCastingService will use
 */
export interface LoadedSpell extends SpellDefinition {
  loaded: true  // Marker that this came from JSON
  validatedAt: number  // Timestamp
}
