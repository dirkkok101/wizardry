/**
 * CombatUIStateService - Manages combat UI state and computed values
 *
 * Extracted from MazeComponent to provide composition and reduce god-class.
 * Provides computed values for combat-related UI elements.
 *
 * Dependencies:
 * - Receives state via callbacks from MazeComponent
 *
 * Provides:
 * - getCombatActionTexts: Status text for each character card
 * - getCombatFooterMenuItems: Footer menu during combat
 * - getTargetingFooterMenuItems: Footer menu during target selection
 * - getCombatActionsForCharacter: Action buttons for character cards
 */

import { Injectable } from '@angular/core'
import { Character } from '@models/Character'
import { CombatState, MonsterGroup, CombatCommand } from '@models/Combat'
import { CharacterAction } from '@models/CharacterCardTypes'
import { MenuItem } from '@shared/components/menu/menu.component'
import { CharacterQueries } from '@utils/CharacterQueries'
import { getIdentifiedGroupDisplayText } from '@utils/MonsterNameUtils'

/**
 * Callbacks for MazeComponent integration
 */
export interface CombatUICallbacks {
  inCombat: () => boolean
  combatState: () => CombatState | undefined
  combatRoundNumber: () => number
  monsterGroups: () => MonsterGroup[]
  partyCharacters: () => Character[]
  selectedActions: () => Map<string, CombatCommand>
  allActionsSelected: () => boolean
  isExecutingRound: () => boolean
  combatIntroActive: () => boolean
  isTargetingMode: () => boolean
}

@Injectable({
  providedIn: 'root'
})
export class CombatUIStateService {
  // ============================================================
  // CALLBACKS (set by MazeComponent)
  // ============================================================

  private callbacks: CombatUICallbacks | null = null

  // ============================================================
  // INITIALIZATION
  // ============================================================

  /**
   * Set callbacks for MazeComponent integration
   * Must be called before using the service
   */
  setCallbacks(callbacks: CombatUICallbacks): void {
    this.callbacks = callbacks
  }

  // ============================================================
  // PURE HELPER FUNCTIONS
  // ============================================================

  /**
   * Get display text for a combat command (e.g., "ATTACK → A")
   */
  static getActionDisplayText(command: CombatCommand): string {
    const groupId = command.data?.groupId
    const targetText = groupId ? ` → ${groupId}` : ''

    switch (command.type) {
      case 'ATTACK':
        return `ATTACK${targetText}`
      case 'PARRY':
        return 'PARRY'
      case 'RUN':
        return 'FLEE'
      case 'CAST_SPELL':
        const spellId = command.data?.spellId
        if (spellId) {
          return `${spellId.toUpperCase()}${targetText}`
        }
        return `CAST${targetText}`
      default:
        return command.type
    }
  }

  // ============================================================
  // COMPUTED VALUES (called as methods, need callbacks)
  // ============================================================

  /**
   * Combat action status texts - shows "ATTACK → A" or "Incapacitated" on character cards
   */
  getCombatActionTexts(): Map<string, string> {
    if (!this.callbacks) return new Map()
    if (!this.callbacks.inCombat()) return new Map()

    const actions = this.callbacks.selectedActions()
    const textMap = new Map<string, string>()
    const party = this.callbacks.partyCharacters()

    for (const char of party) {
      // Show "Incapacitated" for characters who can't act
      if (CharacterQueries.isIncapacitated(char)) {
        textMap.set(char.id, 'Incapacitated')
        continue
      }

      // Show selected action text if action has been chosen
      const command = actions.get(char.id)
      if (command) {
        textMap.set(char.id, CombatUIStateService.getActionDisplayText(command))
      }
    }

    return textMap
  }

  /**
   * Get combat actions for a character card
   * Returns action buttons ([Attack], [Cast], [Parry]) for characters who haven't selected yet
   * Returns empty during round execution or when party is surprised
   */
  getCombatActionsForCharacter(char: Character): CharacterAction[] {
    if (!this.callbacks) return []

    // No actions during intro phase (ENCOUNTER/AMBUSH/SURPRISE letterboxes)
    if (this.callbacks.combatIntroActive()) {
      return []
    }

    // No actions during round execution (monsters attacking, spells resolving, etc.)
    if (this.callbacks.isExecutingRound()) {
      return []
    }

    // If character already has action selected, show status text instead (return empty)
    if (this.callbacks.selectedActions().has(char.id)) {
      return []
    }

    // Incapacitated characters show "Incapacitated" label, no buttons
    if (CharacterQueries.isIncapacitated(char)) {
      return []
    }

    // Build action list based on character capabilities
    const actions: CharacterAction[] = [
      { type: 'attack', enabled: true }
    ]

    // Add Cast if character has combat spells
    if (CharacterQueries.canCastSpells(char, 'combat')) {
      actions.push({ type: 'cast-spell', enabled: true })
    }

    actions.push({ type: 'parry', enabled: true })

    return actions
  }

  /**
   * Simplified combat footer menu items: [Start Round], [Flee], [Reset Actions]
   * Action selection now happens on character cards, not in footer
   */
  getCombatFooterMenuItems(): MenuItem[] {
    if (!this.callbacks) return []

    const allSelected = this.callbacks.allActionsSelected()
    const isExecuting = this.callbacks.isExecutingRound()
    const canFlee = this.callbacks.combatState()?.canFlee ?? false
    const hasAnyActions = this.callbacks.selectedActions().size > 0
    const roundNumber = this.callbacks.combatRoundNumber()

    return [
      {
        id: 'start-round',
        label: `Start Round ${roundNumber}`,
        shortcut: 'ENTER',
        enabled: allSelected && !isExecuting
      },
      {
        id: 'flee',
        label: 'Flee',
        shortcut: 'F',
        enabled: canFlee && !isExecuting
      },
      {
        id: 'reset-actions',
        label: 'Reset Actions',
        shortcut: 'R',
        enabled: hasAnyActions && !isExecuting
      }
    ]
  }

  /**
   * Targeting footer menu items: [A] Monster Group, [B] Monster Group, [ESC] Cancel
   * Shown when player is selecting a target for attack or spell
   */
  getTargetingFooterMenuItems(): MenuItem[] {
    if (!this.callbacks) return []

    const groups = this.callbacks.monsterGroups()
    if (!this.callbacks.isTargetingMode() || groups.length === 0) return []

    const items: MenuItem[] = groups
      .filter(g => g.monsters.some(m => m.hp > 0)) // Only groups with alive monsters
      .map(group => {
        const aliveCount = group.monsters.filter(m => m.hp > 0).length
        const firstMonster = group.monsters[0]
        const displayName = getIdentifiedGroupDisplayText(aliveCount, firstMonster, group.identified)
        return {
          id: `target-${group.id}`,
          label: displayName,
          shortcut: group.id, // 'A', 'B', 'C', 'D'
          enabled: true
        }
      })

    // Add Cancel option
    items.push({
      id: 'cancel-targeting',
      label: 'Cancel',
      shortcut: 'ESC',
      enabled: true
    })

    return items
  }
}
