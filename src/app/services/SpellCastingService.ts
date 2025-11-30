// src/services/SpellCastingService.ts
import { Character } from '@models/Character'
import { CharacterStatus } from '@models/CharacterStatus'
import { SpellEffect, Combatant, MonsterInstance } from '@models/Combat'
import { SpellDataLoader } from './SpellDataLoader'
import { LoadedSpell } from '@models/SpellDefinition'
import { RandomService } from './RandomService'
import { ResistanceService } from './ResistanceService'

// Spell targeting types
export type SpellTarget = 'single' | 'group' | 'all_enemies' | 'all_allies' | 'self'

// Status cure types
export type StatusCure = 'poison' | 'paralysis' | 'silence' | 'blind' | 'asleep' | 'all'

// Spell success rate constants
const SPELL_SUCCESS_RATES = {
  MALOR_TELEPORT: 0.75,
  LOKTOFEIT_LEVEL_MULTIPLIER: 2,
  LOKTOFEIT_MAX_RATE: 95,
  // Resurrection now uses Vitality-based formula from spell JSON
  RESURRECTION_VITALITY_MULTIPLIER: 4,  // (Vitality × 4)%
  RESURRECTION_CRITICAL_VITALITY: 3     // At this vitality or below, failure = LOST
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

      // Apply resistance checks for each target (monsters only)
      const damage: number[] = []
      const resistedTargets: string[] = []

      for (const target of validTargets) {
        let baseDamage = this.rollDice(spell.damage!.dice)

        // Check resistance for monsters
        if ('monsterId' in target) {
          const monster = target as MonsterInstance
          const resistResult = ResistanceService.checkResistance(monster, spell)

          if (resistResult.resisted) {
            // Fully resisted - no damage
            resistedTargets.push(monster.name)
            damage.push(0)
            continue
          }

          // Apply damage multiplier (0.5 for elemental resistance)
          baseDamage = Math.floor(baseDamage * resistResult.damageMultiplier)
        }

        damage.push(baseDamage)
      }

      // Build result message
      let message = `${spell.name} deals ${damage.filter(d => d > 0).join(', ')} damage!`
      if (resistedTargets.length > 0) {
        message += ` (${resistedTargets.join(', ')} resisted)`
      }

      return {
        damage,
        message
      }
    }

    // Handle status effect spells
    if (spell.statusEffect) {
      // Extract status effect string (handle both string and object forms)
      const statusEffectStr = typeof spell.statusEffect === 'object'
        ? spell.statusEffect.type
        : spell.statusEffect

      // Check resistance for each target (monsters only)
      const statusEffects: { target: string; effect: string }[] = []
      const resistedTargets: string[] = []

      for (const target of targets) {
        // Check resistance for monsters
        if ('monsterId' in target) {
          const monster = target as MonsterInstance
          const resistResult = ResistanceService.checkStatusEffectResistance(monster, spell)

          if (resistResult.resisted) {
            resistedTargets.push(monster.name)
            continue
          }
        }

        // Target did not resist - apply status effect
        statusEffects.push({
          target: target.id,
          effect: statusEffectStr
        })
      }

      // Generate appropriate message based on effect
      let effectMsg = ''
      const effectUpper = statusEffectStr.toUpperCase()
      switch (effectUpper) {
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

      // Build result message
      let message = `${spell.name} ${effectMsg}`
      if (resistedTargets.length > 0) {
        message += ` (${resistedTargets.join(', ')} resisted)`
      }
      if (statusEffects.length === 0) {
        message = `${spell.name} has no effect! (all targets resisted)`
      }

      return {
        statusEffects,
        message
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
       * Success rate: (caster level × 2 + 1)%, maximum 95%
       * Research: Original was Level×2%, corrected to (Level×2+1)%
       * Failure: Party remains in dungeon
       */
      if (spell.utility === 'recall') {
        // Success rate: (caster level × 2 + 1)%, max 95%
        const casterLevel = caster.level || 1
        const successRate = Math.min(
          (casterLevel * SPELL_SUCCESS_RATES.LOKTOFEIT_LEVEL_MULTIPLIER) + 1,
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

    /**
     * Handle monster identification (LATUMAPIC)
     * Bug-fixed: Original Wizardry only identified ONE random group
     * Corrected behavior: Identifies ALL monster groups for the entire expedition
     */
    if (spell.effect?.type === 'identify_monsters') {
      // Get all unique group IDs from the targets
      const groupIds = new Set<'A' | 'B' | 'C' | 'D'>()
      for (const target of targets) {
        // Extract group ID from target - targets should include group info
        // For now, we identify ALL groups passed as targets
        if ('id' in target) {
          const groupId = target.id as 'A' | 'B' | 'C' | 'D'
          if (['A', 'B', 'C', 'D'].includes(groupId)) {
            groupIds.add(groupId)
          }
        }
      }

      return {
        monsterIdentification: {
          groupIds: Array.from(groupIds)
        },
        message: `${spell.name} reveals the identity of all monsters!`
      }
    }

    // Handle instant death spells (MAKANITO, LAKANITO, BADI)
    if (spell.instantDeath) {
      // Check immunity and resistance for each target
      const instantDeath: string[] = []
      const immuneTargets: string[] = []
      const resistedTargets: string[] = []

      for (const target of targets) {
        // Check immunity/resistance for monsters
        if ('monsterId' in target) {
          const monster = target as MonsterInstance
          const deathCheck = ResistanceService.checkInstantDeathResistance(monster, spell)

          if (deathCheck.immune) {
            immuneTargets.push(monster.name)
            continue
          }

          if (deathCheck.resisted) {
            resistedTargets.push(monster.name)
            continue
          }
        }

        // Target is killed
        instantDeath.push(target.id)
      }

      // Build result message
      let message = ''
      if (instantDeath.length > 0) {
        message = `${spell.name} invokes instant death!`
      } else {
        message = `${spell.name} fails to claim any victims!`
      }
      if (immuneTargets.length > 0) {
        message += ` (${immuneTargets.join(', ')} immune)`
      }
      if (resistedTargets.length > 0) {
        message += ` (${resistedTargets.join(', ')} resisted)`
      }

      return {
        instantDeath,
        message
      }
    }

    // Handle resurrection spell (DI, KADORTO)
    // Note: Resurrection requires Character data for Vitality-based success rate
    // This path is for fallback when called via resolveSpellEffect without Character data
    if (spell.resurrection) {
      // When called without Character data, return basic result
      // The proper resurrection is done via resolveResurrection() with Character data
      const resurrection = targets.map(t => ({
        targetId: t.id,
        success: false,
        resultStatus: 'ASHES' as const,
        newHp: 0,
        vitalityLoss: 1,
        message: 'Resurrection requires Character data - use resolveResurrection()'
      }))
      return {
        resurrection,
        message: `${spell.name} - use resolveResurrection() for proper handling`
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

  /**
   * Resolve resurrection spell (DI, KADORTO) with Vitality-based success rate
   *
   * Research-based mechanics:
   * - Success rate: (Vitality × 4)%, capped at 100%
   * - DI: DEAD → OK (1 HP) on success, DEAD → ASHES on failure
   * - KADORTO: DEAD/ASHES → OK (full HP) on success, DEAD → ASHES or ASHES → LOST on failure
   * - Critical: If Vitality ≤ 3 at cast time, failure always results in LOST
   * - Both spells reduce Vitality by 1 on any attempt (success or failure)
   *
   * @param spellId - 'di' or 'kadorto'
   * @param target - The dead/ashed character to resurrect
   * @returns Resurrection result with updated character state
   */
  static resolveResurrection(
    spellId: string,
    target: Character
  ): {
    success: boolean
    resultStatus: 'OK' | 'ASHES' | 'LOST'
    newHp: number
    vitalityLoss: number
    message: string
    updatedCharacter: Character
  } {
    const spell = SpellDataLoader.getSpell(spellId)
    if (!spell || !spell.resurrection) {
      return {
        success: false,
        resultStatus: target.status === CharacterStatus.DEAD ? 'ASHES' : 'LOST',
        newHp: 0,
        vitalityLoss: 0,
        message: 'Invalid resurrection spell',
        updatedCharacter: target
      }
    }

    const isDI = spellId.toLowerCase() === 'di'
    const targetIsAshes = target.status === CharacterStatus.ASHES

    // DI only works on DEAD, not ASHES
    if (isDI && targetIsAshes) {
      return {
        success: false,
        resultStatus: 'ASHES',
        newHp: 0,
        vitalityLoss: 0,
        message: `${spell.name} cannot resurrect ashes - use KADORTO`,
        updatedCharacter: target
      }
    }

    // Calculate success rate: (Vitality × 4)%, capped at 100%
    const successRate = Math.min(
      target.vitality * SPELL_SUCCESS_RATES.RESURRECTION_VITALITY_MULTIPLIER,
      100
    )

    // Check for critical low vitality (≤3 means failure = LOST)
    const isCriticalVitality = target.vitality <= SPELL_SUCCESS_RATES.RESURRECTION_CRITICAL_VITALITY

    // Roll for success
    const success = RandomService.chance(successRate)

    // Vitality is always reduced by 1 on any attempt
    const newVitality = Math.max(0, target.vitality - 1)

    if (success) {
      // Success: resurrect with appropriate HP
      const newHp = isDI ? 1 : target.maxHp  // DI = 1 HP, KADORTO = full HP
      const newStatus = CharacterStatus.OK

      return {
        success: true,
        resultStatus: 'OK',
        newHp,
        vitalityLoss: 1,
        message: `${spell.name} succeeds! ${target.name} rises with ${isDI ? '1' : 'full'} HP!`,
        updatedCharacter: {
          ...target,
          status: newStatus,
          hp: newHp,
          vitality: newVitality
        }
      }
    } else {
      // Failure: determine result based on current status and vitality
      let resultStatus: 'ASHES' | 'LOST'
      let newStatus: CharacterStatus

      if (isCriticalVitality) {
        // Critical vitality: any failure = LOST
        resultStatus = 'LOST'
        newStatus = CharacterStatus.LOST
      } else if (targetIsAshes) {
        // KADORTO on ASHES: failure = LOST
        resultStatus = 'LOST'
        newStatus = CharacterStatus.LOST
      } else {
        // DEAD: failure = ASHES
        resultStatus = 'ASHES'
        newStatus = CharacterStatus.ASHES
      }

      const lostMessage = resultStatus === 'LOST'
        ? `${target.name} is lost forever!`
        : `${target.name} crumbles to ashes!`

      return {
        success: false,
        resultStatus,
        newHp: 0,
        vitalityLoss: 1,
        message: `${spell.name} fails! ${lostMessage}`,
        updatedCharacter: {
          ...target,
          status: newStatus,
          hp: 0,
          vitality: newVitality
        }
      }
    }
  }

  /**
   * Calculate resurrection success rate for display purposes
   * @param vitality - Character's vitality stat
   * @returns Success percentage (0-100)
   */
  static getResurrectionSuccessRate(vitality: number): number {
    return Math.min(vitality * SPELL_SUCCESS_RATES.RESURRECTION_VITALITY_MULTIPLIER, 100)
  }
}
