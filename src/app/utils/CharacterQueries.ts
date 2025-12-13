/**
 * CharacterQueries - DRY utility functions for common character state checks
 *
 * Consolidates repeated character status and capability checks used across:
 * - MazeComponent
 * - CombatService
 * - SpellCastingService
 * - Various UI components
 *
 * All functions are pure and stateless.
 */

import { Character } from '@models/Character'
import { CharacterStatus } from '@models/CharacterStatus'
import { SpellLearningService } from '@services/SpellLearningService'
import { SpellCastingService } from '@services/SpellCastingService'

/**
 * Status conditions that prevent a character from taking any action
 */
export const INCAPACITATING_STATUSES: readonly CharacterStatus[] = [
  CharacterStatus.DEAD,
  CharacterStatus.ASHES,
  CharacterStatus.LOST,
  CharacterStatus.PARALYZED,
  CharacterStatus.ASLEEP,
  CharacterStatus.STONED
] as const

/**
 * Status conditions that indicate a character is no longer alive
 */
export const DEATH_STATUSES: readonly CharacterStatus[] = [
  CharacterStatus.DEAD,
  CharacterStatus.ASHES,
  CharacterStatus.LOST
] as const

/**
 * Status conditions that can be cured at the temple
 */
export const TEMPLE_CURABLE_STATUSES: readonly CharacterStatus[] = [
  CharacterStatus.POISONED,
  CharacterStatus.PARALYZED,
  CharacterStatus.STONED
] as const

export const CharacterQueries = {
  /**
   * Check if character can take actions (not incapacitated)
   * Used for: combat action selection, spell casting eligibility
   */
  canAct(char: Character): boolean {
    return !INCAPACITATING_STATUSES.includes(char.status) && char.hp > 0
  },

  /**
   * Check if character is incapacitated (cannot take any actions)
   */
  isIncapacitated(char: Character): boolean {
    return INCAPACITATING_STATUSES.includes(char.status) || char.hp <= 0
  },

  /**
   * Check if character is dead (any death state)
   */
  isDead(char: Character): boolean {
    return DEATH_STATUSES.includes(char.status)
  },

  /**
   * Check if character is alive (not in any death state)
   */
  isAlive(char: Character): boolean {
    return !DEATH_STATUSES.includes(char.status) && char.hp > 0
  },

  /**
   * Check if character can cast spells in given context
   * Used for: combat action buttons, spell panel visibility
   */
  canCastSpells(char: Character, context: 'dungeon' | 'combat'): boolean {
    return (
      this.canAct(char) &&
      SpellLearningService.isCaster(char) &&
      SpellCastingService.hasSpellsInContext(char, context)
    )
  },

  /**
   * Check if character has any spells in their spellbook
   */
  hasSpellbook(char: Character): boolean {
    return SpellLearningService.isCaster(char)
  },

  /**
   * Check if character can be targeted for healing
   */
  canBeHealed(char: Character): boolean {
    return this.isAlive(char) && char.hp < char.maxHp
  },

  /**
   * Check if character needs resurrection
   */
  needsResurrection(char: Character): boolean {
    return char.status === CharacterStatus.DEAD || char.status === CharacterStatus.ASHES
  },

  /**
   * Check if character has any curable status condition
   */
  needsCure(char: Character): boolean {
    return TEMPLE_CURABLE_STATUSES.includes(char.status)
  },

  /**
   * Check if character is in front row (can melee attack)
   * Note: Requires party context - use with frontRow array
   */
  isInFrontRow(char: Character, frontRow: string[]): boolean {
    return frontRow.includes(char.id)
  },

  /**
   * Check if character can perform melee attacks
   */
  canMeleeAttack(char: Character, frontRow: string[]): boolean {
    return this.canAct(char) && this.isInFrontRow(char, frontRow)
  },

  /**
   * Get alive members from a party array
   */
  getAliveMembers(party: Character[]): Character[] {
    return party.filter(c => this.isAlive(c))
  },

  /**
   * Get members who can act from a party array
   */
  getActiveMembers(party: Character[]): Character[] {
    return party.filter(c => this.canAct(c))
  },

  /**
   * Get members who can cast spells from a party array
   */
  getCasters(party: Character[], context: 'dungeon' | 'combat'): Character[] {
    return party.filter(c => this.canCastSpells(c, context))
  },

  /**
   * Get members who need healing
   */
  getMembersNeedingHealing(party: Character[]): Character[] {
    return party.filter(c => this.canBeHealed(c))
  },

  /**
   * Get members who need resurrection
   */
  getMembersNeedingResurrection(party: Character[]): Character[] {
    return party.filter(c => this.needsResurrection(c))
  },

  /**
   * Check if any party member is alive
   */
  hasAliveMember(party: Character[]): boolean {
    return party.some(c => this.isAlive(c))
  },

  /**
   * Check if entire party is dead
   */
  isPartyWiped(party: Character[]): boolean {
    return party.every(c => this.isDead(c) || c.hp <= 0)
  },

  /**
   * Get HP percentage for a character
   */
  getHpPercent(char: Character): number {
    if (char.maxHp === 0) return 0
    return Math.round((char.hp / char.maxHp) * 100)
  },

  /**
   * Get HP status category for styling
   */
  getHpStatus(char: Character): 'healthy' | 'warning' | 'critical' {
    const percent = this.getHpPercent(char)
    if (percent > 50) return 'healthy'
    if (percent > 25) return 'warning'
    return 'critical'
  },

  /**
   * Check if character has low HP (< 25%)
   */
  hasLowHp(char: Character): boolean {
    return this.getHpPercent(char) < 25 && char.hp > 0
  },

  /**
   * Get character's effective AC (including buffs)
   * Note: This is base AC only - combat buffs are applied separately
   */
  getEffectiveAc(char: Character): number {
    return char.ac
  },

  /**
   * Check if character can use items
   */
  canUseItems(char: Character): boolean {
    return this.canAct(char)
  },

  /**
   * Check if character can equip items
   */
  canEquipItems(char: Character): boolean {
    // Dead/lost characters can't equip, but stoned/paralyzed can be equipped by others
    return !DEATH_STATUSES.includes(char.status)
  },

  /**
   * Check if character has available inventory slots
   */
  hasInventorySpace(char: Character): boolean {
    const MAX_INVENTORY = 8
    return char.inventory.length < MAX_INVENTORY
  },

  /**
   * Get available inventory slots
   */
  getAvailableInventorySlots(char: Character): number {
    const MAX_INVENTORY = 8
    return MAX_INVENTORY - char.inventory.length
  }
} as const

// Re-export for convenience
export { CharacterStatus }
