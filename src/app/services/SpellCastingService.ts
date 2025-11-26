// src/services/SpellCastingService.ts
import { Character } from '@models/Character'
import { CharacterStatus } from '@models/CharacterStatus'
import { SpellEffect, Combatant } from '@models/Combat'
import { SpellDataLoader } from './SpellDataLoader'
import { LoadedSpell } from '@models/SpellDefinition'
import { RandomService } from './RandomService'

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

// Use LoadedSpell from SpellDefinition
export type SpellData = LoadedSpell

export class SpellCastingService {
  static canCastSpell(caster: Character, spellId: string): {
    canCast: boolean
    reason?: string
  } {
    const spell = SpellDataLoader.getSpell(spellId)
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

    const pool = spell.casterType === 'mage' ? caster.spellPoints.mage : caster.spellPoints.priest
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
    const spell = SpellDataLoader.getSpell(spellId)!
    if (!caster.spellPoints) return caster

    const pool = spell.casterType === 'mage' ? caster.spellPoints.mage : caster.spellPoints.priest
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
        [spell.casterType]: newPool
      }
    }
  }

  static resolveSpellEffect(
    spellId: string,
    caster: Character,
    targets: Combatant[]
  ): SpellEffect {
    const spell = SpellDataLoader.getSpell(spellId)
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
    if (spell.damage) {
      // For undead-only spells, filter targets to only undead
      const validTargets = spell.undeadOnly
        ? targets.filter(t => 'monsterId' in t && t.undead === true)
        : targets

      if (spell.undeadOnly && validTargets.length === 0) {
        return {
          message: `${spell.name} has no effect on living creatures!`
        }
      }

      const damage = validTargets.map(() => this.rollDice(spell.damage!.dice))
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
        case 'PARALYZED':
          effectMsg = 'paralyzes the enemy group!'
          break
      }

      return {
        statusEffects,
        message: `${spell.name} ${effectMsg}`
      }
    }

    // Handle healing spells
    if (spell.healing) {
      if (spell.healing.type === 'full') {
        // Full heal (MALIKTO)
        const fullHeal = targets.map(t => t.id)
        return {
          fullHeal,
          message: `${spell.name} fully restores the party!`
        }
      } else if (spell.healing.dice) {
        const healing = targets.map(() => this.rollDice(spell.healing!.dice!))
        return {
          healing,
          message: `${spell.name} heals ${healing.join(', ')} HP!`
        }
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
        const success = RandomService.roll(spell.teleportSuccessRate || 0.75)
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
        const success = RandomService.chance(successRate)
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

    // Unknown spell type
    return { message: `${spell.name} has no effect` }
  }

  private static rollDice(dice: string): number {
    // Parse "1d8" format
    const [count, sides] = dice.split('d').map(Number)
    return RandomService.rollDice(count, sides)
  }

  /**
   * Get spell data by ID
   */
  static getSpell(spellId: string): SpellData | undefined {
    return SpellDataLoader.getSpell(spellId.toLowerCase())
  }

  /**
   * Get spells available to cast in a specific context (combat, dungeon, town)
   * Filters by castableIn property and valid target types for the context
   */
  static getSpellsByContext(
    character: Character,
    context: 'combat' | 'dungeon' | 'town'
  ): SpellData[] {
    const availableSpells = this.getAvailableSpells(character)

    // Filter by context
    const contextFiltered = availableSpells.filter(spell =>
      spell.castableIn.includes(context)
    )

    // For dungeon/town context, also filter out combat-only target types
    if (context === 'dungeon' || context === 'town') {
      const validDungeonTargets = ['single', 'party', 'self', 'all_allies', 'dead_body', 'ashes']
      return contextFiltered.filter(spell =>
        validDungeonTargets.includes(spell.target)
      )
    }

    return contextFiltered
  }

  /**
   * Check if character has any spells available in a given context
   */
  static hasSpellsInContext(
    character: Character,
    context: 'combat' | 'dungeon' | 'town'
  ): boolean {
    return this.getSpellsByContext(character, context).length > 0
  }

  /**
   * Get all spells for a character based on class and available spell points
   */
  static getAvailableSpells(character: Character): SpellData[] {
    if (!character.spellPoints) return []

    const allSpells = SpellDataLoader.getAllSpells()
    const available: SpellData[] = []

    // Check each spell from loaded data
    for (const spell of allSpells.values()) {
      // Check if character has the right spell type
      const pool = spell.casterType === 'mage' ? character.spellPoints.mage : character.spellPoints.priest
      if (!pool) continue

      // Check if character has points for this spell level
      const levelKey = `level${spell.level}` as keyof typeof pool
      const points = pool[levelKey]
      if (points && points.current > 0) {
        // Only include if character knows the spell
        if (character.knownSpells?.includes(spell.id)) {
          available.push(spell)
        }
      }
    }

    // Sort by level, then alphabetically
    return available.sort((a, b) => {
      if (a.level !== b.level) return a.level - b.level
      return a.name.localeCompare(b.name)
    })
  }
}
