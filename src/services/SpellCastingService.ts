// src/services/SpellCastingService.ts
import { Character } from '../types/Character'
import { CharacterStatus } from '../types/CharacterStatus'
import { SpellEffect, Combatant } from '../types/Combat'

// Simplified spell data for now
interface SpellData {
  id: string
  name: string
  level: number
  type: 'mage' | 'priest'
  damageType?: string
  damageDice?: string
  statusEffect?: 'BLIND' | 'SILENCED' | 'ASLEEP'  // Status effect applied to target group
  healingDice?: string     // Healing amount (e.g., "1d8", "2d8")
  acModifier?: number      // AC buff modifier (negative = better AC, e.g., -2 for MOGREF)
}

const SPELL_CACHE = new Map<string, SpellData>()

// Mage Level 1 Spells
SPELL_CACHE.set('halito', {
  id: 'halito',
  name: 'HALITO',
  level: 1,
  type: 'mage',
  damageType: 'fire',
  damageDice: '1d8'
})

SPELL_CACHE.set('katino', {
  id: 'katino',
  name: 'KATINO',
  level: 1,
  type: 'mage',
  statusEffect: 'ASLEEP'
})

// Mage Level 2 Spells
SPELL_CACHE.set('dilto', {
  id: 'dilto',
  name: 'DILTO',
  level: 2,
  type: 'mage',
  statusEffect: 'BLIND'
})

SPELL_CACHE.set('mogref', {
  id: 'mogref',
  name: 'MOGREF',
  level: 2,
  type: 'mage',
  acModifier: -2  // Improves AC by 2
})

// Priest Level 1 Spells
SPELL_CACHE.set('dios', {
  id: 'dios',
  name: 'DIOS',
  level: 1,
  type: 'priest',
  healingDice: '1d8'
})

// Priest Level 2 Spells
SPELL_CACHE.set('dial', {
  id: 'dial',
  name: 'DIAL',
  level: 2,
  type: 'priest',
  healingDice: '2d8'
})

SPELL_CACHE.set('montino', {
  id: 'montino',
  name: 'MONTINO',
  level: 2,
  type: 'priest',
  statusEffect: 'SILENCED'
})

// Priest Level 3 Spells
SPELL_CACHE.set('kalki', {
  id: 'kalki',
  name: 'KALKI',
  level: 3,
  type: 'priest',
  acModifier: -1  // Improves AC by 1
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
      const damage = targets.map(() => this.rollDice(spell.damageDice!))
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
}
