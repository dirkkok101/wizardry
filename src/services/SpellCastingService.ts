// src/services/SpellCastingService.ts
import { Character } from '../types/Character'
import { CharacterStatus } from '../types/CharacterStatus'
import { SpellEffect, Combatant } from '../types/Combat'

// Spell targeting types
export type SpellTarget = 'single' | 'group' | 'all_enemies' | 'all_allies' | 'self'

// Status cure types
export type StatusCure = 'poison' | 'paralysis' | 'silence' | 'blind' | 'asleep' | 'all'

// Spell success rate constants
const SPELL_SUCCESS_RATES = {
  MALOR_TELEPORT: 0.75,
  KADORTO_RESURRECTION: 0.50,
  DI_RESURRECTION: 0.90,
  LOKTOFEIT_LEVEL_MULTIPLIER: 2,
  LOKTOFEIT_MAX_RATE: 95
} as const

// Simplified spell data for now
export interface SpellData {
  id: string
  name: string
  level: number
  type: 'mage' | 'priest'
  target: SpellTarget      // How the spell targets combatants
  damageType?: string
  damageDice?: string
  undeadOnly?: boolean     // If true, only damages undead (BADIOS, etc.)
  statusEffect?: 'BLIND' | 'SILENCED' | 'ASLEEP' | 'INVISIBLE'  // Status effect applied to target group
  healingDice?: string     // Healing amount (e.g., "1d8", "2d8")
  healToFull?: boolean     // If true, heals to maximum HP (MALIKTO)
  acModifier?: number      // AC buff modifier (negative = better AC, e.g., -2 for MOGREF)
  utility?: 'reveal_stats' | 'identify_foe' | 'identify_trap' | 'extended_light' | 'locate_person' | 'teleport' | 'recall' | 'show_coordinates'  // Utility effects
  instantDeath?: boolean   // If true, instant kill (MAKANITO)
  resurrection?: boolean   // If true, resurrects dead (KADORTO)
  resurrectionSuccessRate?: number  // Success rate for resurrection (0.50 for KADORTO, 0.90 for DI)
  statusCure?: StatusCure  // Cures status ailments (LITOKAN, LATUMOFIS)
  causeFear?: boolean      // If true, causes fear/flee (MORLIS)
  dispelMagic?: boolean  // If true, dispels magic effects (ZILWAN)
  transformation?: boolean  // If true, transforms monsters (HAMAN, MAHAMAN)
  teleportSuccessRate?: number  // Success rate for teleport (MALOR)
  recallSuccessRate?: number  // Success rate for recall (LOKTOFEIT) - calculated as level × 2%
  ignoresAC?: boolean  // If true, ignores AC (LAKANITO)
}

const SPELL_CACHE = new Map<string, SpellData>()

// Mage Level 1 Spells
SPELL_CACHE.set('halito', {
  id: 'halito',
  name: 'HALITO',
  level: 1,
  type: 'mage',
  target: 'group',
  damageType: 'fire',
  damageDice: '1d8'
})

SPELL_CACHE.set('katino', {
  id: 'katino',
  name: 'KATINO',
  level: 1,
  type: 'mage',
  target: 'group',
  statusEffect: 'ASLEEP'
})

SPELL_CACHE.set('dumapic', {
  id: 'dumapic',
  name: 'DUMAPIC',
  level: 1,
  type: 'mage',
  target: 'self',
  utility: 'show_coordinates'
})

// Mage Level 2 Spells
SPELL_CACHE.set('dilto', {
  id: 'dilto',
  name: 'DILTO',
  level: 2,
  type: 'mage',
  target: 'group',
  statusEffect: 'BLIND'
})

SPELL_CACHE.set('mogref', {
  id: 'mogref',
  name: 'MOGREF',
  level: 2,
  type: 'mage',
  target: 'all_allies',
  acModifier: -2  // Improves AC by 2
})

SPELL_CACHE.set('melito', {
  id: 'melito',
  name: 'MELITO',
  level: 2,
  type: 'mage',
  target: 'group',
  damageType: 'fire',
  damageDice: '1d8'
})

SPELL_CACHE.set('sopic', {
  id: 'sopic',
  name: 'SOPIC',
  level: 2,
  type: 'mage',
  target: 'single',
  statusEffect: 'INVISIBLE'
})

// Mage Level 3 Spells
SPELL_CACHE.set('mahalito', {
  id: 'mahalito',
  name: 'MAHALITO',
  level: 3,
  type: 'mage',
  target: 'group',
  damageType: 'fire',
  damageDice: '4d6'  // 4-24 damage
})

SPELL_CACHE.set('lahalito', {
  id: 'lahalito',
  name: 'LAHALITO',
  level: 3,
  type: 'mage',
  target: 'single',
  damageType: 'fire',
  damageDice: '6d6'  // 6-36 damage
})

SPELL_CACHE.set('molito', {
  id: 'molito',
  name: 'MOLITO',
  level: 3,
  type: 'mage',
  target: 'group',
  damageType: 'fire',
  damageDice: '3d6'
})

// Priest Level 1 Spells
SPELL_CACHE.set('dios', {
  id: 'dios',
  name: 'DIOS',
  level: 1,
  type: 'priest',
  target: 'single',
  healingDice: '1d8'
})

SPELL_CACHE.set('badios', {
  id: 'badios',
  name: 'BADIOS',
  level: 1,
  type: 'priest',
  target: 'single',
  damageType: 'holy',
  damageDice: '1d8',
  undeadOnly: true  // Only damages undead
})

SPELL_CACHE.set('porfic', {
  id: 'porfic',
  name: 'PORFIC',
  level: 1,
  type: 'priest',
  target: 'single',
  acModifier: -4
})

SPELL_CACHE.set('milwa', {
  id: 'milwa',
  name: 'MILWA',
  level: 1,
  type: 'priest',
  target: 'group',
  utility: 'reveal_stats'
})

// Priest Level 2 Spells
SPELL_CACHE.set('dial', {
  id: 'dial',
  name: 'DIAL',
  level: 2,
  type: 'priest',
  target: 'all_allies',
  healingDice: '2d8'
})

SPELL_CACHE.set('montino', {
  id: 'montino',
  name: 'MONTINO',
  level: 2,
  type: 'priest',
  target: 'group',
  statusEffect: 'SILENCED'
})

SPELL_CACHE.set('latumapic', {
  id: 'latumapic',
  name: 'LATUMAPIC',
  level: 2,
  type: 'priest',
  target: 'group',
  utility: 'identify_foe'
})

SPELL_CACHE.set('calfo', {
  id: 'calfo',
  name: 'CALFO',
  level: 2,
  type: 'priest',
  target: 'self',
  utility: 'identify_trap'
})

SPELL_CACHE.set('manifo', {
  id: 'manifo',
  name: 'MANIFO',
  level: 2,
  type: 'priest',
  target: 'group',
  statusEffect: 'SILENCED'
})

SPELL_CACHE.set('matu', {
  id: 'matu',
  name: 'MATU',
  level: 2,
  type: 'priest',
  target: 'all_allies',
  acModifier: -2
})

// Priest Level 3 Spells
SPELL_CACHE.set('kalki', {
  id: 'kalki',
  name: 'KALKI',
  level: 3,
  type: 'priest',
  target: 'all_allies',
  acModifier: -1  // Improves AC by 1
})

SPELL_CACHE.set('bamatu', {
  id: 'bamatu',
  name: 'BAMATU',
  level: 3,
  type: 'priest',
  target: 'all_allies',
  acModifier: -4
})

SPELL_CACHE.set('lomilwa', {
  id: 'lomilwa',
  name: 'LOMILWA',
  level: 3,
  type: 'priest',
  target: 'self',
  utility: 'extended_light'
})

// Mage Level 4 Spells
SPELL_CACHE.set('dalto', {
  id: 'dalto',
  name: 'DALTO',
  level: 4,
  type: 'mage',
  target: 'group',
  damageType: 'fire',
  damageDice: '6d6'  // 6-36 damage to group
})

SPELL_CACHE.set('morlis', {
  id: 'morlis',
  name: 'MORLIS',
  level: 4,
  type: 'mage',
  target: 'group',
  causeFear: true
})

// Mage Level 5 Spells
SPELL_CACHE.set('makanito', {
  id: 'makanito',
  name: 'MAKANITO',
  level: 5,
  type: 'mage',
  target: 'single',
  instantDeath: true
})

SPELL_CACHE.set('lakanito', {
  id: 'lakanito',
  name: 'LAKANITO',
  level: 5,
  type: 'mage',
  target: 'group',
  damageType: 'air',
  damageDice: '6d6',
  ignoresAC: true
})

SPELL_CACHE.set('zilwan', {
  id: 'zilwan',
  name: 'ZILWAN',
  level: 5,
  type: 'mage',
  target: 'group',
  dispelMagic: true
})

SPELL_CACHE.set('madalto', {
  id: 'madalto',
  name: 'MADALTO',
  level: 5,
  type: 'mage',
  target: 'all_enemies',
  damageType: 'cold',
  damageDice: '8d6'
})

// Mage Level 6 Spells
SPELL_CACHE.set('haman', {
  id: 'haman',
  name: 'HAMAN',
  level: 6,
  type: 'mage',
  target: 'single',
  transformation: true
})

SPELL_CACHE.set('lomilwa_mage', {
  id: 'lomilwa_mage',
  name: 'LOMILWA',
  level: 6,
  type: 'mage',
  target: 'self',
  utility: 'extended_light'
})

SPELL_CACHE.set('malor', {
  id: 'malor',
  name: 'MALOR',
  level: 6,
  type: 'mage',
  target: 'self',
  utility: 'teleport',
  teleportSuccessRate: SPELL_SUCCESS_RATES.MALOR_TELEPORT
})

// Mage Level 7 Spells
SPELL_CACHE.set('tiltowait', {
  id: 'tiltowait',
  name: 'TILTOWAIT',
  level: 7,
  type: 'mage',
  target: 'group',
  damageType: 'fire',
  damageDice: '10d10'  // 10-100 damage - the nuke!
})

SPELL_CACHE.set('mahaman', {
  id: 'mahaman',
  name: 'MAHAMAN',
  level: 7,
  type: 'mage',
  target: 'all_enemies',
  transformation: true
})

// Priest Level 4 Spells
SPELL_CACHE.set('badial', {
  id: 'badial',
  name: 'BADIAL',
  level: 4,
  type: 'priest',
  target: 'group',
  damageType: 'holy',
  damageDice: '2d8',
  undeadOnly: true
})

SPELL_CACHE.set('latumofis', {
  id: 'latumofis',
  name: 'LATUMOFIS',
  level: 4,
  type: 'priest',
  target: 'single',
  statusCure: 'paralysis'
})

SPELL_CACHE.set('bamordi', {
  id: 'bamordi',
  name: 'BAMORDI',
  level: 4,
  type: 'priest',
  target: 'single',
  damageType: 'holy',
  damageDice: '3d8'
})

SPELL_CACHE.set('dalto_priest', {
  id: 'dalto_priest',
  name: 'DALTO',
  level: 4,
  type: 'priest',
  target: 'all_enemies',
  damageType: 'cold',
  damageDice: '4d6'
})

SPELL_CACHE.set('kandi', {
  id: 'kandi',
  name: 'KANDI',
  level: 4,
  type: 'priest',
  target: 'self',
  utility: 'locate_person'
})

SPELL_CACHE.set('katu', {
  id: 'katu',
  name: 'KATU',
  level: 4,
  type: 'priest',
  target: 'all_allies',
  acModifier: -6
})

SPELL_CACHE.set('maporfic', {
  id: 'maporfic',
  name: 'MAPORFIC',
  level: 4,
  type: 'priest',
  target: 'all_allies',
  acModifier: -4
})

// Priest Level 5 Spells
SPELL_CACHE.set('dialko', {
  id: 'dialko',
  name: 'DIALKO',
  level: 5,
  type: 'priest',
  target: 'single',
  healingDice: '4d8'  // Critical healing
})

SPELL_CACHE.set('badialma', {
  id: 'badialma',
  name: 'BADIALMA',
  level: 5,
  type: 'priest',
  target: 'all_enemies',
  damageType: 'holy',
  damageDice: '4d8',
  undeadOnly: true
})

SPELL_CACHE.set('litokan', {
  id: 'litokan',
  name: 'LITOKAN',
  level: 5,
  type: 'priest',
  target: 'all_allies',
  statusCure: 'all'  // Cures poison, paralysis, silence, blind, asleep
})

SPELL_CACHE.set('badi', {
  id: 'badi',
  name: 'BADI',
  level: 5,
  type: 'priest',
  target: 'single',
  instantDeath: true
})

SPELL_CACHE.set('loktofeit', {
  id: 'loktofeit',
  name: 'LOKTOFEIT',
  level: 5,
  type: 'priest',
  target: 'self',
  utility: 'recall'
})

// Priest Level 6 Spells
SPELL_CACHE.set('madi', {
  id: 'madi',
  name: 'MADI',
  level: 6,
  type: 'priest',
  target: 'all_allies',
  healingDice: '3d8'  // Heals entire party
})

SPELL_CACHE.set('lorto', {
  id: 'lorto',
  name: 'LORTO',
  level: 6,
  type: 'priest',
  target: 'all_enemies',
  damageType: 'physical',
  damageDice: '6d6'
})

// Priest Level 7 Spells
SPELL_CACHE.set('kadorto', {
  id: 'kadorto',
  name: 'KADORTO',
  level: 7,
  type: 'priest',
  target: 'single',
  resurrection: true,
  resurrectionSuccessRate: SPELL_SUCCESS_RATES.KADORTO_RESURRECTION
})

SPELL_CACHE.set('malikto', {
  id: 'malikto',
  name: 'MALIKTO',
  level: 7,
  type: 'priest',
  target: 'all_allies',
  healToFull: true  // Fully restores entire party
})

SPELL_CACHE.set('di', {
  id: 'di',
  name: 'DI',
  level: 7,
  type: 'priest',
  target: 'single',
  resurrection: true,
  resurrectionSuccessRate: SPELL_SUCCESS_RATES.DI_RESURRECTION
})

SPELL_CACHE.set('mabadi', {
  id: 'mabadi',
  name: 'MABADI',
  level: 7,
  type: 'priest',
  target: 'all_enemies',
  instantDeath: true
})

export class SpellCastingService {
  static canCastSpell(caster: Character, spellId: string): {
    canCast: boolean
    reason?: string
  } {
    const spell = SPELL_CACHE.get(spellId)
    if (!spell) {
      return { canCast: false, reason: 'Unknown spell' }
    }

    // Check incapacitation
    if (caster.status === CharacterStatus.ASLEEP || caster.status === CharacterStatus.PARALYZED) {
      return { canCast: false, reason: 'Cannot cast while incapacitated' }
    }

    // Check spell points
    if (!caster.spellPoints) {
      return { canCast: false, reason: 'No spell points' }
    }

    const pool = spell.type === 'mage' ? caster.spellPoints.mage : caster.spellPoints.priest
    if (!pool) {
      return { canCast: false, reason: 'No spell points' }
    }

    // Get spell points for the level
    const levelKey = `level${spell.level}` as keyof typeof pool
    const spellPoints = pool[levelKey]?.current || 0

    if (spellPoints < 1) {
      return { canCast: false, reason: 'Insufficient spell points' }
    }

    return { canCast: true }
  }

  static deductSpellPoints(caster: Character, spellId: string): Character {
    const spell = SPELL_CACHE.get(spellId)!
    if (!caster.spellPoints) return caster

    const pool = spell.type === 'mage' ? caster.spellPoints.mage : caster.spellPoints.priest
    if (!pool) return caster

    // Get spell level key
    const levelKey = `level${spell.level}` as keyof typeof pool
    const currentPoints = pool[levelKey]?.current || 0

    // Create new pool with updated points
    const newPool = {
      ...pool,
      [levelKey]: {
        ...pool[levelKey],
        current: Math.max(0, currentPoints - 1)
      }
    }

    return {
      ...caster,
      spellPoints: {
        ...caster.spellPoints,
        [spell.type]: newPool
      }
    }
  }

  static resolveSpellEffect(
    spellId: string,
    caster: Character,
    targets: Combatant[]
  ): SpellEffect {
    const spell = SPELL_CACHE.get(spellId)
    if (!spell) {
      return { message: 'Unknown spell' }
    }

    /**
     * Handle dispel magic effects (ZILWAN)
     * Removes all active magical effects from target group
     * Affects: AC buffs, status effects, invisibility, etc.
     */
    if (spell.dispelMagic) {
      const targetIds = targets.map(t => t.id)
      return {
        dispelEffects: targetIds,
        message: `${spell.name} dispels all magic effects!`
      }
    }

    /**
     * Handle transformation effects (HAMAN, MAHAMAN)
     * Transforms monsters into different types
     * HAMAN: Single target transformation
     * MAHAMAN: Group transformation
     * Target type is resolved by CombatService based on dungeon level
     */
    if (spell.transformation) {
      const transformations = targets.map(t => ({
        monsterId: t.id,
        newType: 'RANDOM'  // Will be resolved by CombatService based on level
      }))
      return {
        transformations,
        message: `${spell.name} transforms the monsters!`
      }
    }

    // Handle offensive spells (damage)
    if (spell.damageType && spell.damageDice) {
      // For undead-only spells, filter targets to only undead
      const validTargets = spell.undeadOnly
        ? targets.filter(t => 'monsterId' in t && t.undead === true)
        : targets

      if (spell.undeadOnly && validTargets.length === 0) {
        return {
          message: `${spell.name} has no effect on living creatures!`
        }
      }

      const damage = validTargets.map(() => this.rollDice(spell.damageDice!))
      return {
        damage,
        message: `${spell.name} deals ${damage.join(', ')} damage!`
      }
    }

    // Handle status effect spells
    if (spell.statusEffect) {
      const statusEffects = targets.map(target => ({
        target: target.id,
        effect: spell.statusEffect!
      }))

      // Generate appropriate message based on effect
      let effectMsg = ''
      switch (spell.statusEffect) {
        case 'ASLEEP':
          effectMsg = 'puts the enemy group to sleep!'
          break
        case 'BLIND':
          effectMsg = 'blinds the enemy group!'
          break
        case 'SILENCED':
          effectMsg = 'silences the enemy group!'
          break
      }

      return {
        statusEffects,
        message: `${spell.name} ${effectMsg}`
      }
    }

    // Handle healing spells
    if (spell.healingDice) {
      const healing = targets.map(() => this.rollDice(spell.healingDice!))
      return {
        healing,
        message: `${spell.name} heals ${healing.join(', ')} HP!`
      }
    }

    // Handle AC buff spells
    if (spell.acModifier) {
      const acBuffs = targets.map(target => ({
        target: target.id,
        acModifier: spell.acModifier!
      }))
      return {
        acBuffs,
        message: `${spell.name} strengthens the party's defenses!`
      }
    }

    // Handle utility spells
    if (spell.utility) {
      /**
       * Handle teleportation (MALOR)
       * Teleports party to a specific dungeon location
       * Success rate: 75% (SPELL_SUCCESS_RATES.MALOR_TELEPORT)
       * Failure: Party is scattered to random locations
       * Target coordinates provided by dungeon navigation UI
       */
      if (spell.utility === 'teleport') {
        // Success rate from spell data, default 75%
        const success = Math.random() < (spell.teleportSuccessRate || 0.75)
        return {
          teleport: {
            success
            // Coordinates will be provided by dungeon navigation UI
          },
          message: success
            ? `${spell.name} teleports the party!`
            : `${spell.name} fails! The party is scattered!`
        }
      }

      /**
       * Handle recall to town (LOKTOFEIT)
       * Returns party to town from dungeon
       * Success rate: (caster level × 2)%, maximum 95%
       * Uses SPELL_SUCCESS_RATES.LOKTOFEIT_LEVEL_MULTIPLIER and LOKTOFEIT_MAX_RATE
       * Failure: Party remains in dungeon
       */
      if (spell.utility === 'recall') {
        // Success rate: caster level × 2%, max 95%
        const casterLevel = caster.level || 1
        const successRate = Math.min(
          casterLevel * SPELL_SUCCESS_RATES.LOKTOFEIT_LEVEL_MULTIPLIER,
          SPELL_SUCCESS_RATES.LOKTOFEIT_MAX_RATE
        )
        const success = Math.random() * 100 < successRate
        return {
          recall: { success },
          message: success
            ? `${spell.name} recalls the party to town!`
            : `${spell.name} fails! The party remains in the dungeon!`
        }
      }

      // Handle other utility spells
      const targetIds = targets.map(t => t.id)
      const revealType = spell.utility === 'reveal_stats' ? 'stats' : 'identity'

      let message = ''
      if (spell.utility === 'reveal_stats') {
        message = `${spell.name} reveals the monsters' vital signs!`
      } else if (spell.utility === 'identify_foe') {
        message = `${spell.name} identifies the enemy!`
      } else if (spell.utility === 'identify_trap') {
        message = `${spell.name} reveals any traps nearby!`
      } else if (spell.utility === 'extended_light') {
        message = `${spell.name} creates extended light!`
      } else if (spell.utility === 'locate_person') {
        message = `${spell.name} locates missing persons!`
      } else if (spell.utility === 'show_coordinates') {
        message = `${spell.name} shows your location in the dungeon!`
      }

      return {
        revealedInfo: {
          targetIds,
          type: revealType
        },
        message
      }
    }

    // Handle full healing spell (MALIKTO)
    if (spell.healToFull) {
      const fullHeal = targets.map(t => t.id)
      return {
        fullHeal,
        message: `${spell.name} fully restores the party!`
      }
    }

    // Handle instant death spell (MAKANITO)
    if (spell.instantDeath) {
      const instantDeath = targets.map(t => t.id)
      return {
        instantDeath,
        message: `${spell.name} invokes instant death!`
      }
    }

    // Handle resurrection spell (KADORTO)
    if (spell.resurrection) {
      const resurrection = targets.map(t => t.id)
      return {
        resurrection,
        message: `${spell.name} resurrects the fallen!`
      }
    }

    // Handle status cure spells (LITOKAN, LATUMOFIS)
    if (spell.statusCure) {
      const targetIds = targets.map(t => t.id)
      let message = ''
      if (spell.statusCure === 'all') {
        message = `${spell.name} cures all ailments!`
      } else if (spell.statusCure === 'paralysis') {
        message = `${spell.name} cures paralysis!`
      } else if (spell.statusCure === 'poison') {
        message = `${spell.name} cures poison!`
      } else {
        message = `${spell.name} cures ${spell.statusCure}!`
      }

      return {
        statusCures: {
          targetIds,
          cureType: spell.statusCure
        },
        message
      }
    }

    // Handle fear spell (MORLIS)
    if (spell.causeFear) {
      const causeFear = targets.map(t => t.id)
      return {
        causeFear,
        message: `${spell.name} strikes fear into the enemies!`
      }
    }

    // Unknown spell type
    return { message: `${spell.name} has no effect` }
  }

  private static rollDice(dice: string): number {
    // Parse "1d8" format
    const [count, sides] = dice.split('d').map(Number)
    let total = 0
    for (let i = 0; i < count; i++) {
      total += Math.floor(Math.random() * sides) + 1
    }
    return total
  }

  /**
   * Get spell data by ID
   */
  static getSpell(spellId: string): SpellData | undefined {
    return SPELL_CACHE.get(spellId.toLowerCase())
  }

  /**
   * Get all spells for a character based on class and available spell points
   */
  static getAvailableSpells(character: Character): SpellData[] {
    if (!character.spellPoints) return []

    const available: SpellData[] = []

    // Check each spell in cache
    for (const spell of SPELL_CACHE.values()) {
      // Check if character has the right spell type
      const pool = spell.type === 'mage' ? character.spellPoints.mage : character.spellPoints.priest
      if (!pool) continue

      // Check if character has points for this spell level
      const levelKey = `level${spell.level}` as keyof typeof pool
      const points = pool[levelKey]
      if (points && points.current > 0) {
        available.push(spell)
      }
    }

    // Sort by level, then alphabetically
    return available.sort((a, b) => {
      if (a.level !== b.level) return a.level - b.level
      return a.name.localeCompare(b.name)
    })
  }
}
