import { GameState } from '@models/GameState'
import { Character } from '@models/Character'
import { CharacterStatus } from '@models/CharacterStatus'
import { SpellPointPool } from '@models/SpellPoints'
import { RandomService } from '@services/RandomService'

/**
 * Represents a party member who needs healing
 */
export interface HealingTarget {
  characterId: string
  characterName: string
  damage: number
  hasStatusEffect: boolean
  statusEffect?: CharacterStatus
}

/**
 * Healing spell metadata
 */
export interface HealingSpellInfo {
  spellId: string
  name: string
  spellLevel: number
  minHeal: number
  maxHeal: number
  avgHeal: number
  curesStatus: boolean
}

/**
 * Caster with available healing spells
 */
export interface CasterInfo {
  character: Character
  availableSpells: HealingSpellInfo[]
}

/**
 * A single healing action to execute
 */
export interface HealingAction {
  casterId: string
  casterName: string
  spellId: string
  spellName: string
  targetId: string
  targetName: string
  spellLevel: number
}

/**
 * Result of executing a single heal
 */
export interface HealingResult {
  action: HealingAction
  healAmount: number
  newHP: number
  statusCured: boolean
  message: string
}

/**
 * Statuses that exclude characters from healing (need resurrection instead)
 */
const UNHEALABLE_STATUSES = [
  CharacterStatus.DEAD,
  CharacterStatus.ASHES,
  CharacterStatus.LOST
]

/**
 * Statuses that MADI can cure (matched to madi.json curesConditions)
 */
const CURABLE_STATUSES = [
  CharacterStatus.POISONED,
  CharacterStatus.PARALYZED,
  CharacterStatus.STONED,
  CharacterStatus.ASLEEP
]

/**
 * Healing spells data (derived from spell JSON files)
 * Level → Spell mapping: L1=DIOS, L4=DIAL, L5=DIALMA, L6=MADI
 */
const HEALING_SPELLS: HealingSpellInfo[] = [
  { spellId: 'dios', name: 'DIOS', spellLevel: 1, minHeal: 1, maxHeal: 8, avgHeal: 4.5, curesStatus: false },
  { spellId: 'dial', name: 'DIAL', spellLevel: 4, minHeal: 2, maxHeal: 16, avgHeal: 9, curesStatus: false },
  { spellId: 'dialma', name: 'DIALMA', spellLevel: 5, minHeal: 3, maxHeal: 24, avgHeal: 13.5, curesStatus: false },
  { spellId: 'madi', name: 'MADI', spellLevel: 6, minHeal: Infinity, maxHeal: Infinity, avgHeal: Infinity, curesStatus: true }
]

/**
 * HealingService - Intelligent party healing logic
 *
 * Pure functions for finding healing targets, selecting optimal spells,
 * and executing healing actions.
 */
export class HealingService {
  /**
   * Find all party members who need healing
   * Returns targets sorted by most damaged first
   *
   * Excludes: DEAD, ASHES, LOST (need resurrection, not healing)
   * Includes: OK, POISONED, PARALYZED, STONED, ASLEEP with damage
   */
  static findHealingTargets(state: GameState): HealingTarget[] {
    const targets: HealingTarget[] = []

    for (const memberId of state.party.members) {
      const character = state.roster.get(memberId)
      if (!character) continue

      // Skip unhealable characters
      if (UNHEALABLE_STATUSES.includes(character.status)) continue

      // Skip characters at full HP
      const damage = character.maxHp - character.hp
      if (damage <= 0) continue

      // Check for curable status effects
      const hasStatusEffect = CURABLE_STATUSES.includes(character.status)

      targets.push({
        characterId: character.id,
        characterName: character.name,
        damage,
        hasStatusEffect,
        statusEffect: hasStatusEffect ? character.status : undefined
      })
    }

    // Sort by most damaged first
    return targets.sort((a, b) => b.damage - a.damage)
  }

  /**
   * Find all casters in party with available healing spells
   * Returns casters with their available healing spells based on current spell points
   */
  static findHealingCasters(state: GameState): CasterInfo[] {
    const casters: CasterInfo[] = []

    for (const memberId of state.party.members) {
      const character = state.roster.get(memberId)
      if (!character) continue

      // Must have priest spell points
      const priestPool = character.spellPoints?.priest
      if (!priestPool) continue

      // Find available healing spells based on current spell points
      const availableSpells = this.getAvailableHealingSpells(priestPool)
      if (availableSpells.length === 0) continue

      casters.push({ character, availableSpells })
    }

    return casters
  }

  /**
   * Get healing spells available based on spell point pool
   */
  private static getAvailableHealingSpells(pool: SpellPointPool): HealingSpellInfo[] {
    const available: HealingSpellInfo[] = []

    for (const spell of HEALING_SPELLS) {
      const levelKey = `level${spell.spellLevel}` as keyof SpellPointPool
      const points = pool[levelKey]
      if (points && points.current > 0) {
        available.push(spell)
      }
    }

    return available
  }

  /**
   * Select optimal healing spell for given damage and status
   *
   * Algorithm:
   * 1. If target has curable status AND MADI available → use MADI
   * 2. Match damage to spell efficiency:
   *    - 1-8 damage → DIOS (1d8)
   *    - 9-16 damage → DIAL (2d8)
   *    - 17-24 damage → DIALMA (3d8)
   *    - 25+ damage → MADI (full heal)
   * 3. Fall back to any available spell if optimal unavailable
   */
  static selectOptimalSpell(
    damage: number,
    hasStatusEffect: boolean,
    availableSpells: HealingSpellInfo[]
  ): HealingSpellInfo | null {
    if (availableSpells.length === 0) return null

    // Priority 1: MADI if target has curable status effect
    if (hasStatusEffect) {
      const madi = availableSpells.find(s => s.spellId === 'madi')
      if (madi) return madi
    }

    // Priority 2: Match spell to damage size for efficiency
    let preferredOrder: string[]
    if (damage <= 8) {
      preferredOrder = ['dios', 'dial', 'dialma', 'madi']
    } else if (damage <= 16) {
      preferredOrder = ['dial', 'dialma', 'madi', 'dios']
    } else if (damage <= 24) {
      preferredOrder = ['dialma', 'madi', 'dial', 'dios']
    } else {
      preferredOrder = ['madi', 'dialma', 'dial', 'dios']
    }

    // Find first available spell in preferred order
    for (const spellId of preferredOrder) {
      const spell = availableSpells.find(s => s.spellId === spellId)
      if (spell) return spell
    }

    // Fallback to any available spell
    return availableSpells[0]
  }

  /**
   * Check if any party member needs healing
   */
  static partyNeedsHealing(state: GameState): boolean {
    return this.findHealingTargets(state).length > 0
  }

  /**
   * Check if any caster has healing spells available
   */
  static hasHealingSpellsAvailable(state: GameState): boolean {
    return this.findHealingCasters(state).length > 0
  }

  /**
   * Generate next healing action to execute
   * Returns null if no more healing possible (all healed or out of spells)
   */
  static getNextHealingAction(state: GameState): HealingAction | null {
    const targets = this.findHealingTargets(state)
    if (targets.length === 0) return null

    const casters = this.findHealingCasters(state)
    if (casters.length === 0) return null

    // Get the most damaged target
    const target = targets[0]

    // Find best caster/spell combination for this target
    for (const caster of casters) {
      const spell = this.selectOptimalSpell(
        target.damage,
        target.hasStatusEffect,
        caster.availableSpells
      )
      if (spell) {
        return {
          casterId: caster.character.id,
          casterName: caster.character.name,
          spellId: spell.spellId,
          spellName: spell.name,
          targetId: target.characterId,
          targetName: target.characterName,
          spellLevel: spell.spellLevel
        }
      }
    }

    return null
  }

  /**
   * Execute a single healing action
   * Returns updated GameState with healed character and deducted spell points
   */
  static executeHealingAction(
    state: GameState,
    action: HealingAction
  ): { newState: GameState; result: HealingResult } {
    const target = state.roster.get(action.targetId)!
    const caster = state.roster.get(action.casterId)!
    const spell = HEALING_SPELLS.find(s => s.spellId === action.spellId)!

    // Calculate heal amount
    let healAmount: number
    let statusCured = false

    if (spell.spellId === 'madi') {
      // MADI: Full heal + cure status
      healAmount = target.maxHp - target.hp
      statusCured = CURABLE_STATUSES.includes(target.status)
    } else {
      // Roll dice: DIOS=1d8, DIAL=2d8, DIALMA=3d8
      const diceCount = spell.spellId === 'dios' ? 1 : spell.spellId === 'dial' ? 2 : 3
      healAmount = RandomService.rollDice(diceCount, 8)
    }

    // Cap at max HP
    const actualHeal = Math.min(healAmount, target.maxHp - target.hp)
    const newHP = target.hp + actualHeal

    // Update target
    const updatedTarget: Character = {
      ...target,
      hp: newHP,
      status: statusCured ? CharacterStatus.OK : target.status
    }

    // Deduct spell point from caster
    const levelKey = `level${action.spellLevel}` as keyof SpellPointPool
    const priestPool = caster.spellPoints!.priest!
    const updatedCaster: Character = {
      ...caster,
      spellPoints: {
        ...caster.spellPoints,
        priest: {
          ...priestPool,
          [levelKey]: {
            ...priestPool[levelKey],
            current: priestPool[levelKey].current - 1
          }
        }
      }
    }

    // Build new roster
    const newRoster = new Map(state.roster)
    newRoster.set(action.targetId, updatedTarget)
    newRoster.set(action.casterId, updatedCaster)

    const newState: GameState = {
      ...state,
      roster: newRoster
    }

    // Generate message
    const message = statusCured
      ? `${action.casterName} casts ${action.spellName}! ${action.targetName} fully healed and cured!`
      : `${action.casterName} casts ${action.spellName}! ${action.targetName} heals ${actualHeal} HP.`

    const result: HealingResult = {
      action,
      healAmount: actualHeal,
      newHP,
      statusCured,
      message
    }

    return { newState, result }
  }
}
