// src/services/SpellCastingService.ts
import { Character } from '../types/Character'
import { CharacterStatus } from '../types/CharacterStatus'
import { SpellEffect, Combatant } from '../types/Combat'

// Spell targeting types
export type SpellTarget = 'single' | 'group' | 'all_enemies' | 'all_allies' | 'self'

// Status cure types
export type StatusCure = 'poison' | 'paralysis' | 'silence' | 'blind' | 'asleep' | 'all'

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
  statusEffect?: 'BLIND' | 'SILENCED' | 'ASLEEP'  // Status effect applied to target group
  healingDice?: string     // Healing amount (e.g., "1d8", "2d8")
  healToFull?: boolean     // If true, heals to maximum HP (MALIKTO)
  acModifier?: number      // AC buff modifier (negative = better AC, e.g., -2 for MOGREF)
  utility?: 'reveal_stats' | 'identify_foe'  // Utility effects
  instantDeath?: boolean   // If true, instant kill (MAKANITO)
  resurrection?: boolean   // If true, resurrects dead (KADORTO)
  statusCure?: StatusCure  // Cures status ailments (LITOKAN, LATUMOFIS)
  causeFear?: boolean      // If true, causes fear/flee (MORLIS)
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

// Priest Level 3 Spells
SPELL_CACHE.set('kalki', {
  id: 'kalki',
  name: 'KALKI',
  level: 3,
  type: 'priest',
  target: 'all_allies',
  acModifier: -1  // Improves AC by 1
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

// Priest Level 6 Spells
SPELL_CACHE.set('madi', {
  id: 'madi',
  name: 'MADI',
  level: 6,
  type: 'priest',
  target: 'all_allies',
  healingDice: '3d8'  // Heals entire party
})

// Priest Level 7 Spells
SPELL_CACHE.set('kadorto', {
  id: 'kadorto',
  name: 'KADORTO',
  level: 7,
  type: 'priest',
  target: 'single',
  resurrection: true
})

SPELL_CACHE.set('malikto', {
  id: 'malikto',
  name: 'MALIKTO',
  level: 7,
  type: 'priest',
  target: 'all_allies',
  healToFull: true  // Fully restores entire party
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
      const targetIds = targets.map(t => t.id)
      const revealType = spell.utility === 'reveal_stats' ? 'stats' : 'identity'

      let message = ''
      if (spell.utility === 'reveal_stats') {
        message = `${spell.name} reveals the monsters' vital signs!`
      } else if (spell.utility === 'identify_foe') {
        message = `${spell.name} identifies the enemy!`
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
