import { Character } from '@models/Character'
import { CharacterStatus } from '@models/CharacterStatus'
import { SpellData } from './SpellCastingService'

/**
 * Targeting mode determines which UI to show for target selection.
 * Used for dungeon/camp context where 'single' always means ally.
 */
export type TargetingMode = 'none' | 'character' | 'monster_group'

/**
 * Combat-specific targeting mode that distinguishes offensive vs support for 'single' target.
 * In combat:
 * - Offensive 'single' spells (HALITO, BADIOS) → target monster group
 * - Support 'single' spells (DIOS, DIALKO) → target party member
 */
export type CombatTargetingMode = 'none' | 'party_member' | 'monster_group'

/**
 * SpellTargetingService - Centralized spell targeting logic
 *
 * Handles all targeting validation for spells:
 * - Determines what type of targeting UI to show (none, character, monster group)
 * - Validates which characters are eligible targets (alive vs dead)
 * - Validates which eligible characters would benefit from the spell (needs healing, has status)
 * - Provides user-friendly messages when no valid targets exist
 *
 * Architecture:
 * - Pure static functions (no side effects)
 * - UI-independent (no Angular dependencies)
 * - Reusable across all scenes (dungeon, combat, camp)
 *
 * Separation of concerns:
 * - isEligibleTarget: CAN this character be shown in the dialog?
 * - isValidCharacterTarget: Does this character have the Select button enabled?
 */
export class SpellTargetingService {
  /**
   * Determine what targeting UI should be shown for a spell.
   * Use this for dungeon/camp context where 'single' always means ally.
   *
   * @returns 'none' if spell auto-resolves (party, self, all enemies)
   * @returns 'character' if player must select a party member
   * @returns 'monster_group' if player must select a monster group
   */
  static getTargetingMode(spell: SpellData): TargetingMode {
    switch (spell.target) {
      case 'self':
      case 'caster':
      case 'party':
      case 'all_allies':
      case 'all_enemies':
        return 'none'  // No selection needed - auto-resolve
      case 'single':
      case 'dead_ally':
      case 'dead_or_ashed_ally':
        return 'character'  // Show character selection dialog
      case 'group':
        return 'monster_group'  // Show monster group selection
      default:
        return 'none'
    }
  }

  /**
   * Determine targeting mode for combat context.
   * Unlike getTargetingMode(), this distinguishes offensive vs support for 'single' target:
   * - Offensive 'single' spells (HALITO, BADIOS) → target monster group
   * - Support 'single' spells (DIOS, DIALKO) → target party member
   *
   * @returns 'none' if spell auto-resolves (self, party, all_enemies, all_allies)
   * @returns 'party_member' if player must select a party member
   * @returns 'monster_group' if player must select a monster group
   */
  static getCombatTargetingMode(spell: SpellData): CombatTargetingMode {
    // Auto-resolve targets (no selection needed)
    const autoTargets = ['self', 'caster', 'party', 'all_allies', 'all_enemies']
    if (autoTargets.includes(spell.target)) {
      return 'none'
    }

    // Single target - depends on spell type (offensive vs support)
    if (spell.target === 'single') {
      // Offensive spells target monsters (check category or damage property)
      if (spell.category === 'offensive' || spell.damage) {
        return 'monster_group'  // Single monster in a group
      }
      // Support spells (healing, buffs, cures) target party members
      return 'party_member'
    }

    // Group target - always monsters
    if (spell.target === 'group') {
      return 'monster_group'
    }

    // Dead ally targets - party members (resurrection spells)
    if (spell.target === 'dead_ally' || spell.target === 'dead_or_ashed_ally') {
      return 'party_member'
    }

    return 'none'
  }

  /**
   * Get the targeting prompt for a spell.
   * Used as dialog title/header in target selection UI.
   */
  static getTargetingPrompt(spell: SpellData): string {
    if (spell.healing) return 'HEAL WHO?'
    if (spell.resurrection) return 'RESURRECT WHO?'
    if (spell.statusCure) return 'CURE WHO?'
    if (spell.target === 'group') return 'TARGET WHICH GROUP?'
    return 'CAST ON WHO?'
  }

  /**
   * Check if a character is a valid target for a spell.
   * Combines eligibility (can be shown) and validity (would benefit from spell).
   *
   * @param spell The spell being cast
   * @param char The potential target character
   * @returns true if character should have Select button enabled
   */
  static isValidCharacterTarget(spell: SpellData, char: Character): boolean {
    // First check basic eligibility based on target type
    if (!SpellTargetingService.isEligibleTarget(spell, char)) {
      return false
    }

    // Then check spell-specific validity (would the spell do anything useful?)
    if (spell.healing) {
      return char.hp < char.maxHp
    }

    if (spell.statusCure) {
      return SpellTargetingService.characterHasStatusToCure(char, spell.statusCure)
    }

    // Resurrection spells: eligibility already checked above (must be dead/ashed)
    // Other spells (buffs, etc.): all eligible characters are valid
    return true
  }

  /**
   * Check basic eligibility (alive vs dead) based on spell target type.
   * Determines whether a character should be SHOWN in the dialog at all.
   *
   * @param spell The spell being cast
   * @param char The potential target character
   * @returns true if character should appear in selection dialog
   */
  static isEligibleTarget(spell: SpellData, char: Character): boolean {
    switch (spell.target) {
      case 'single':
        // Living party members only (not dead, ashes, or lost)
        return char.status !== CharacterStatus.DEAD &&
               char.status !== CharacterStatus.ASHES &&
               char.status !== CharacterStatus.LOST
      case 'dead_ally':
        // Dead characters only (for resurrection)
        return char.status === CharacterStatus.DEAD
      case 'dead_or_ashed_ally':
        // Dead or ashed characters (for stronger resurrection like KADORTO)
        return char.status === CharacterStatus.DEAD ||
               char.status === CharacterStatus.ASHES
      default:
        return true
    }
  }

  /**
   * Check if character has a status that can be cured by the given cure type.
   */
  private static characterHasStatusToCure(
    char: Character,
    cureType: 'poison' | 'paralysis' | 'silence' | 'blind' | 'asleep' | 'all'
  ): boolean {
    switch (cureType) {
      case 'poison':
        return char.status === CharacterStatus.POISONED
      case 'paralysis':
        return char.status === CharacterStatus.PARALYZED
      case 'asleep':
        return char.status === CharacterStatus.ASLEEP
      case 'all':
        // Can cure any curable status
        return char.status === CharacterStatus.POISONED ||
               char.status === CharacterStatus.PARALYZED ||
               char.status === CharacterStatus.ASLEEP
      // Note: 'silence' and 'blind' don't have CharacterStatus equivalents
      // in this codebase - they may be tracked differently in future
      default:
        return false
    }
  }

  /**
   * Get all valid character targets for a spell.
   * Convenience method that filters a party by validity.
   */
  static getValidCharacterTargets(spell: SpellData, party: Character[]): Character[] {
    return party.filter(char => SpellTargetingService.isValidCharacterTarget(spell, char))
  }

  /**
   * Get all eligible character targets for a spell (may or may not be valid).
   * These are characters that should be SHOWN in the dialog.
   */
  static getEligibleCharacterTargets(spell: SpellData, party: Character[]): Character[] {
    return party.filter(char => SpellTargetingService.isEligibleTarget(spell, char))
  }

  /**
   * Get message when no valid targets exist for a spell.
   * Provides context-specific, user-friendly messages.
   */
  static getNoValidTargetsMessage(spell: SpellData): string {
    if (spell.healing) {
      return 'No one needs healing - all party members are at full HP.'
    }
    if (spell.statusCure === 'poison') {
      return 'No one is poisoned.'
    }
    if (spell.statusCure === 'paralysis') {
      return 'No one is paralyzed.'
    }
    if (spell.statusCure === 'asleep') {
      return 'No one is asleep.'
    }
    if (spell.statusCure === 'all') {
      return 'No one has a status ailment to cure.'
    }
    if (spell.resurrection) {
      return 'No one needs resurrection.'
    }
    return 'No valid targets available.'
  }
}
