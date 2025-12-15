/**
 * Monster Advancement Service
 *
 * Handles automatic monster formation advancement when front row is cleared.
 * When all front-row monsters are dead, back-row melee-only monsters
 * automatically advance to fill the gap.
 *
 * Single Responsibility: Monster formation advancement
 */

import { CombatState, MonsterGroup, MonsterInstance } from '@models/Combat'
import { MonsterDataLoader } from '@services/MonsterDataLoader'
import { MonsterService } from '@services/MonsterService'
import { getMonsterDisplayName } from '@utils/MonsterNameUtils'
import { CombatHelpers } from '../CombatHelpers'

// Re-export for convenience
export { MonsterAdvancementService }

/**
 * Result of checking monster advancement
 */
export interface MonsterAdvancementResult {
  /** Updated combat state */
  newState: CombatState
  /** Message describing what happened (if advancement occurred) */
  message?: string
  /** Whether any group advanced */
  advanced: boolean
}

/**
 * Monster Advancement Service
 *
 * Handles automatic advancement of back-row monsters to front row
 * when front row is cleared.
 */
class MonsterAdvancementService {
  /**
   * Check if a monster group has any alive monsters
   */
  static hasAliveMonsters(group: MonsterGroup): boolean {
    return CombatHelpers.hasAliveMonsters(group.monsters)
  }

  /**
   * Check if a monster group is in front formation with alive monsters
   */
  static isFrontRowWithAlive(group: MonsterGroup): boolean {
    return group.formation === 'front' && this.hasAliveMonsters(group)
  }

  /**
   * Check if a monster group should advance (back row, melee-only, alive)
   */
  static shouldAdvance(group: MonsterGroup): boolean {
    if (group.formation !== 'back') return false
    if (!this.hasAliveMonsters(group)) return false

    // Check if the group has melee-only monsters
    const template = MonsterDataLoader.getMonster(group.monsters[0].monsterId)
    return template !== undefined && !MonsterService.canAttackFromBackRow(template)
  }

  /**
   * Get the first alive monster in a group for display purposes
   */
  static getFirstAliveMonster(group: MonsterGroup): MonsterInstance | undefined {
    return CombatHelpers.getFirstAliveMonster(group.monsters)
  }

  /**
   * Count alive monsters in a group
   */
  static countAliveMonsters(group: MonsterGroup): number {
    return CombatHelpers.countAliveMonsters(group.monsters)
  }

  /**
   * Create advancement message for a group
   */
  static createAdvancementMessage(group: MonsterGroup): string {
    const aliveCount = this.countAliveMonsters(group)
    const firstMonster = group.monsters[0]
    const displayName = getMonsterDisplayName(firstMonster, group.identified)

    return aliveCount > 1
      ? `The ${displayName}s rush forward to fill the gap!`
      : `${displayName} rushes forward to fill the gap!`
  }

  /**
   * Advance a monster group to front formation
   */
  static advanceGroup(
    state: CombatState,
    groupId: string
  ): CombatState {
    return {
      ...state,
      monsterGroups: state.monsterGroups.map(g =>
        g.id === groupId
          ? { ...g, formation: 'front' as const }
          : g
      )
    }
  }

  /**
   * Check and advance monsters if front row is cleared
   *
   * When all front-row monsters are dead, the first back-row group
   * with melee-only monsters automatically advances to fill the gap.
   *
   * @param state - Current combat state
   * @returns Updated state with advancement message if applicable
   */
  static checkAndAdvanceMonsters(state: CombatState): MonsterAdvancementResult {
    // Check if any alive monsters are in the front row
    const hasFrontRowAlive = state.monsterGroups.some(g => this.isFrontRowWithAlive(g))

    // If there are still alive front row monsters, no auto-advance needed
    if (hasFrontRowAlive) {
      return { newState: state, advanced: false }
    }

    // Find the first back-row group with melee-only monsters that can advance
    const groupToAdvance = state.monsterGroups.find(g => this.shouldAdvance(g))

    if (!groupToAdvance) {
      // No back-row melee groups to advance
      return { newState: state, advanced: false }
    }

    // Advance the group
    const message = this.createAdvancementMessage(groupToAdvance)
    const newState = this.advanceGroup(state, groupToAdvance.id)

    return {
      newState,
      message,
      advanced: true
    }
  }

  /**
   * Get current state of a specific monster
   *
   * @param state - Combat state
   * @param monsterId - Monster instance ID to find
   * @returns Current monster state or undefined if not found
   */
  static getCurrentMonsterState(
    state: CombatState,
    monsterId: string
  ): MonsterInstance | undefined {
    for (const group of state.monsterGroups) {
      const monster = group.monsters.find(m => m.id === monsterId)
      if (monster) {
        return monster
      }
    }
    return undefined
  }

  /**
   * Get the group containing a specific monster
   *
   * @param state - Combat state
   * @param monsterId - Monster instance ID to find
   * @returns Monster group or undefined if not found
   */
  static getMonsterGroup(
    state: CombatState,
    monsterId: string
  ): MonsterGroup | undefined {
    return state.monsterGroups.find(g =>
      g.monsters.some(m => m.id === monsterId)
    )
  }
}

// Standalone function exports
export const hasAliveMonsters = MonsterAdvancementService.hasAliveMonsters
export const checkAndAdvanceMonsters = MonsterAdvancementService.checkAndAdvanceMonsters.bind(MonsterAdvancementService)
export const getCurrentMonsterState = MonsterAdvancementService.getCurrentMonsterState
export const getMonsterGroup = MonsterAdvancementService.getMonsterGroup
