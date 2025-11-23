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
}

const SPELL_CACHE = new Map<string, SpellData>()
SPELL_CACHE.set('halito', {
  id: 'halito',
  name: 'HALITO',
  level: 1,
  type: 'mage',
  damageType: 'fire',
  damageDice: '1d8'
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

    // Handle offensive spells
    if (spell?.damageType && spell.damageDice) {
      const damage = targets.map(() => this.rollDice(spell.damageDice!))
      return {
        damage,
        message: `${spell.name} deals ${damage.join(', ')} damage!`
      }
    }

    // TODO: Handle healing, buffs, debuffs
    return { message: 'No effect' }
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
