/**
 * SpellFlowController - Coordinates spell casting UI flow
 *
 * Extracted from MazeComponent to provide composition and reduce god-class.
 * Owns all spell casting related signals and handles phase transitions.
 *
 * Handles two contexts:
 * - Dungeon: Immediate casting with DungeonSpellEffectService
 * - Combat: Action selection for round execution
 *
 * Dependencies:
 * - GameStateService: For reading/updating game state
 * - SpellCastingService: For spell validation and point deduction
 * - DungeonSpellEffectService: For applying spell effects
 *
 * Outputs (callbacks set by MazeComponent):
 * - onAddMessage: Log messages to game console
 * - onRender: Request maze re-render (light spells)
 * - onNavigate: Handle recall spell navigation
 */

import { Injectable, signal, computed } from '@angular/core'
import { Character } from '@models/Character'
import { CharacterStatus } from '@models/CharacterStatus'
import { CombatCommand } from '@models/Combat'
import { DungeonState } from '@models/Dungeon'
import { CharacterOption } from '@shared/components/character-selection-dialog/character-selection-dialog.component'
import { GameStateService } from '@services/GameStateService'
import { SpellCastingService, SpellData } from '@services/SpellCastingService'
import { SpellLearningService } from '@services/SpellLearningService'
import { CombatService } from '@services/CombatService'
import { DungeonSpellEffectService, DungeonSpellContext } from '@services/DungeonSpellEffectService'
import { MazeStateMachine } from '@services/MazeStateMachine'

/**
 * Callbacks for MazeComponent integration
 */
export interface SpellFlowCallbacks {
  addMessage: (message: string) => void
  render: () => void
  navigate: (path: string) => void
  partyCharacters: () => Character[]
  dungeonState: () => DungeonState | undefined
  currentLevel: () => number
  position: () => { x: number; y: number; facing: string } | undefined
  // Combat-specific callbacks
  selectedActions: () => Map<string, CombatCommand>
  updateSelectedActions: (updater: (actions: Map<string, CombatCommand>) => Map<string, CombatCommand>) => void
  setTargetingMode: (characterId: string | null, isTargeting: boolean) => void
  getMazeStateMachine: () => MazeStateMachine
}

@Injectable({
  providedIn: 'root'
})
export class SpellFlowController {
  // ============================================================
  // SIGNALS
  // ============================================================

  readonly showSpellDialog = signal<boolean>(false)
  readonly showTargetDialog = signal<boolean>(false)
  readonly selectedCaster = signal<Character | null>(null)
  readonly selectedSpell = signal<SpellData | null>(null)
  readonly targetOptions = signal<CharacterOption[]>([])
  readonly spellContext = signal<'dungeon' | 'combat'>('dungeon')
  readonly pendingCombatSpell = signal<SpellData | null>(null)

  // ============================================================
  // CALLBACKS (set by MazeComponent)
  // ============================================================

  private callbacks: SpellFlowCallbacks | null = null

  // ============================================================
  // CONSTRUCTOR
  // ============================================================

  constructor(private gameState: GameStateService) {}

  // ============================================================
  // INITIALIZATION
  // ============================================================

  /**
   * Set callbacks for MazeComponent integration
   * Must be called before using the controller
   */
  setCallbacks(callbacks: SpellFlowCallbacks): void {
    this.callbacks = callbacks
  }

  // ============================================================
  // COMPUTED VALUES
  // ============================================================

  /**
   * Check if any spell dialog is active (blocks other input)
   */
  readonly isSpellFlowActive = computed(() =>
    this.showSpellDialog() || this.showTargetDialog()
  )

  // ============================================================
  // DUNGEON SPELL FLOW
  // ============================================================

  /**
   * Open the spell selection dialog for dungeon casting
   */
  openSpellDialog(characterId: string): void {
    if (!this.callbacks) return

    const state = this.gameState.state()
    const caster = state.roster.get(characterId)

    if (!caster) {
      this.callbacks.addMessage('Error: Character not found.')
      return
    }

    // Check if character has any dungeon-castable spells
    if (!SpellCastingService.hasSpellsInContext(caster, 'dungeon')) {
      this.callbacks.addMessage(`${caster.name} has no spells available.`)
      return
    }

    this.selectedCaster.set(caster)
    this.spellContext.set('dungeon')
    this.showSpellDialog.set(true)
  }

  /**
   * Open the spell selection dialog for combat casting
   */
  openCombatSpellMenu(characterId: string): void {
    if (!this.callbacks) return

    const state = this.gameState.state()
    const char = state.roster.get(characterId)

    if (!char) {
      this.callbacks.addMessage('Error: Character not found.')
      return
    }

    // Check if character has combat spells
    if (!SpellCastingService.hasSpellsInContext(char, 'combat')) {
      this.callbacks.addMessage(`${char.name} has no combat spells available.`)
      return
    }

    this.selectedCaster.set(char)
    this.spellContext.set('combat')
    this.showSpellDialog.set(true)
  }

  /**
   * Handle spell selection from the dialog
   * Behavior differs based on context:
   * - dungeon: Cast spell immediately
   * - combat: Store as action for round execution
   */
  onSpellSelected(spell: SpellData): void {
    this.showSpellDialog.set(false)
    this.selectedSpell.set(spell)

    const caster = this.selectedCaster()
    if (!caster) return

    // Handle combat spell selection differently
    if (this.spellContext() === 'combat') {
      this.handleCombatSpellSelection(spell, caster)
      return
    }

    // Dungeon context: cast immediately
    // Check if spell needs a target
    if (spell.target === 'single' || spell.target === 'dead_body' || spell.target === 'ashes') {
      // Open character selection dialog
      this.openTargetDialog(spell)
    } else {
      // Party or self-targeting spell - cast immediately
      this.castDungeonSpell(spell, null)
    }
  }

  /**
   * Cancel spell selection
   */
  onSpellDialogCancelled(): void {
    this.showSpellDialog.set(false)
    this.selectedCaster.set(null)
    this.selectedSpell.set(null)
    this.spellContext.set('dungeon')
    this.pendingCombatSpell.set(null)
  }

  // ============================================================
  // TARGET SELECTION
  // ============================================================

  /**
   * Open character selection dialog for single-target spells
   */
  private openTargetDialog(spell: SpellData): void {
    if (!this.callbacks) return

    const caster = this.selectedCaster()
    const partyChars = this.callbacks.partyCharacters()

    // Build character options based on spell target type
    const options: CharacterOption[] = partyChars.map((char, index) => {
      let enabled = true

      // Filter based on spell target type
      if (spell.target === 'dead_body') {
        enabled = char.status === CharacterStatus.DEAD
      } else if (spell.target === 'ashes') {
        enabled = char.status === CharacterStatus.ASHES
      } else if (spell.target === 'single') {
        // For healing/buff spells, target living characters
        // Skip dead/ashes characters
        enabled = char.status !== CharacterStatus.DEAD &&
                  char.status !== CharacterStatus.ASHES
      }

      return {
        character: char,
        index: index + 1,
        enabled
      }
    })

    // Check if there are any valid targets
    const hasValidTargets = options.some(opt => opt.enabled)
    if (!hasValidTargets) {
      // Show helpful message based on spell target type
      let message = `${caster?.name || 'Caster'} casts ${spell.name}... but there are no valid targets!`
      if (spell.target === 'dead_body') {
        message = `${spell.name} requires a dead body to resurrect, but no one is dead.`
      } else if (spell.target === 'ashes') {
        message = `${spell.name} requires ashes to resurrect, but no one has been reduced to ashes.`
      }
      this.callbacks.addMessage(message)

      // Clear spell selection state
      this.selectedSpell.set(null)
      this.selectedCaster.set(null)
      return
    }

    this.targetOptions.set(options)
    this.showTargetDialog.set(true)
  }

  /**
   * Handle target selection for single-target spells
   */
  onTargetSelected(target: Character): void {
    this.showTargetDialog.set(false)

    const spell = this.selectedSpell() || this.pendingCombatSpell()
    if (!spell) return

    // Handle combat context - create action instead of casting immediately
    if (this.spellContext() === 'combat') {
      this.confirmCombatSpellActionForAlly(spell, target)
      return
    }

    // Dungeon context - cast immediately
    this.castDungeonSpell(spell, target)
  }

  /**
   * Cancel target selection
   */
  onTargetDialogCancelled(): void {
    this.showTargetDialog.set(false)
    this.targetOptions.set([])
    // Go back to spell selection
    const caster = this.selectedCaster()
    if (caster) {
      this.showSpellDialog.set(true)
    }
  }

  // ============================================================
  // COMBAT SPELL FLOW
  // ============================================================

  /**
   * Handle spell selection during combat
   * Stores the spell as the character's action for round execution
   */
  private handleCombatSpellSelection(spell: SpellData, caster: Character): void {
    if (!this.callbacks) return

    // Check if spell targets enemies (offensive, instant_death, or debuff targeting monsters)
    const targetsEnemies = spell.category === 'offensive' ||
                           spell.category === 'instant_death' ||
                           spell.category === 'debuff' ||
                           spell.target === 'all_enemies' ||
                           spell.target === 'group'

    // For offensive spells that target monsters, show monster target selection
    // (except for all_enemies which hits everyone automatically)
    if (targetsEnemies && spell.target !== 'all_enemies') {
      // Update state machine (source of truth)
      const stateMachine = this.callbacks.getMazeStateMachine()
      stateMachine.startTargeting(caster.id, spell)

      // Also update local signals during migration (Phase 4.2)
      this.selectedSpell.set(spell)
      this.pendingCombatSpell.set(spell)
      this.callbacks.setTargetingMode(caster.id, true)
      this.callbacks.addMessage(`${caster.name} prepares ${spell.name}... Select a target.`)
      return
    }

    // Single-target healing/buff spells need character selection
    if (spell.target === 'single' &&
        (spell.category === 'healing' || spell.category === 'buff')) {
      this.pendingCombatSpell.set(spell)
      this.openTargetDialog(spell)
      this.callbacks.addMessage(`${caster.name} prepares ${spell.name}... Select a target.`)
      return
    }

    // For party-wide/self/all-enemy spells, record action immediately - no targeting needed
    const command = CombatService.createCommand(caster, 'CAST_SPELL', undefined, {
      spellId: spell.id
    })

    this.callbacks.updateSelectedActions(actions => {
      const newActions = new Map(actions)
      newActions.set(caster.id, command)
      return newActions
    })

    this.callbacks.addMessage(`${caster.name} will cast ${spell.name}.`)

    // Clear spell selection state
    this.selectedSpell.set(null)
    this.selectedCaster.set(null)
    this.spellContext.set('dungeon')
  }

  /**
   * Confirm combat spell action targeting an ally
   */
  private confirmCombatSpellActionForAlly(spell: SpellData, target: Character): void {
    if (!this.callbacks) return

    const caster = this.selectedCaster()
    if (!caster) return

    // Create combat command with target
    const command = CombatService.createCommand(caster, 'CAST_SPELL', undefined, {
      spellId: spell.id,
      targetId: target.id
    })

    this.callbacks.updateSelectedActions(actions => {
      const newActions = new Map(actions)
      newActions.set(caster.id, command)
      return newActions
    })

    this.callbacks.addMessage(`${caster.name} will cast ${spell.name} on ${target.name}.`)

    // Clear state
    this.clearSpellState()
  }

  /**
   * Confirm monster group target selection for combat spell
   * Called by MazeComponent when monster group is selected
   */
  confirmCombatSpellTarget(groupId: string): void {
    if (!this.callbacks) return

    const caster = this.selectedCaster()
    const spell = this.pendingCombatSpell()
    if (!caster || !spell) return

    const command = CombatService.createCommand(caster, 'CAST_SPELL', undefined, {
      spellId: spell.id,
      groupId
    })

    this.callbacks.updateSelectedActions(actions => {
      const newActions = new Map(actions)
      newActions.set(caster.id, command)
      return newActions
    })

    this.callbacks.addMessage(`${caster.name} will cast ${spell.name} on group ${groupId}.`)

    // Clear targeting mode
    this.callbacks.setTargetingMode(null, false)
    this.clearSpellState()
  }

  /**
   * Cancel combat spell targeting
   */
  cancelCombatSpellTargeting(): void {
    if (!this.callbacks) return

    this.callbacks.setTargetingMode(null, false)
    this.clearSpellState()
  }

  // ============================================================
  // DUNGEON SPELL CASTING
  // ============================================================

  /**
   * Cast a dungeon spell (immediate effect)
   */
  private castDungeonSpell(spell: SpellData, target: Character | null): void {
    if (!this.callbacks) return

    const caster = this.selectedCaster()
    if (!caster) {
      this.callbacks.addMessage('Error: No caster selected.')
      return
    }

    // Verify spell can be cast
    const canCast = SpellCastingService.canCastSpell(caster, spell.id)
    if (!canCast.canCast) {
      this.callbacks.addMessage(`${caster.name} cannot cast ${spell.name}: ${canCast.reason}`)
      return
    }

    // Deduct spell points
    const updatedCaster = SpellCastingService.deductSpellPoints(caster, spell.id)

    // Build spell context
    const dungeon = this.callbacks.dungeonState()
    const position = this.callbacks.position()
    const spellContext: DungeonSpellContext = {
      dungeon,
      currentLevel: this.callbacks.currentLevel(),
      position,
      facing: position?.facing || 'N'
    }

    // Apply spell effect using service
    const result = DungeonSpellEffectService.applyEffect(spell, updatedCaster, target, spellContext)

    // Handle monster identification if needed (LATUMAPIC)
    if (result.identifyMonsters) {
      const combat = this.gameState.state().combat
      if (combat) {
        this.gameState.updateState(state => ({
          ...state,
          combat: state.combat ? {
            ...state.combat,
            monsterGroups: state.combat.monsterGroups.map(g => ({ ...g, identified: true }))
          } : undefined
        }))
      }
    }

    // Update game state with new caster spell points and any other changes
    this.gameState.updateState(state => {
      const newRoster = new Map(state.roster)
      newRoster.set(updatedCaster.id, result.updatedCaster || updatedCaster)

      // Update target if applicable
      if (result.updatedTarget && target) {
        newRoster.set(target.id, result.updatedTarget)
      }

      // Apply party-wide healing if applicable (MADI)
      if (result.partyHeal && result.partyHeal > 0) {
        for (const memberId of state.party.members) {
          const member = newRoster.get(memberId)
          if (member &&
              member.status !== CharacterStatus.DEAD &&
              member.status !== CharacterStatus.ASHES) {
            const newHp = Math.min(member.hp + result.partyHeal, member.maxHp)
            newRoster.set(memberId, { ...member, hp: newHp })
          }
        }
      }

      // Update dungeon state if applicable
      let newDungeon = state.dungeon
      if (result.dungeonUpdate && state.dungeon) {
        newDungeon = { ...state.dungeon, ...result.dungeonUpdate }
      }

      return {
        ...state,
        roster: newRoster,
        dungeon: newDungeon
      }
    })

    // Re-render if dungeon state changed (e.g., light spell)
    if (result.dungeonUpdate) {
      this.callbacks.render()
    }

    // Display result message
    this.callbacks.addMessage(result.message)

    // Handle special spell effects (e.g., recall to town)
    if (result.navigateTo) {
      queueMicrotask(() => {
        this.callbacks?.navigate(result.navigateTo!)
      })
    }

    // Clear selection state
    this.clearSpellState()
  }

  // ============================================================
  // UTILITIES
  // ============================================================

  /**
   * Clear all spell selection state
   */
  private clearSpellState(): void {
    this.selectedCaster.set(null)
    this.selectedSpell.set(null)
    this.pendingCombatSpell.set(null)
    this.spellContext.set('dungeon')
    this.targetOptions.set([])
  }

  /**
   * Reset all state (e.g., when leaving maze or ending combat)
   */
  reset(): void {
    this.showSpellDialog.set(false)
    this.showTargetDialog.set(false)
    this.clearSpellState()
  }
}
