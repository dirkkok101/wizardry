/**
 * ChestSceneComponent - Dedicated scene for chest interaction
 *
 * Part of the scene-per-state refactoring. This scene handles:
 * - Chest opener selection
 * - Trap inspection/CALFO/disarm
 * - Chest opening animation
 * - Treasure distribution
 * - Result display
 *
 * Uses MazeStateStore for state and ChestOrchestrator for actions.
 * Navigates back to maze-navigation when chest interaction is complete.
 */

import { Component, computed, inject, HostListener, OnInit, OnDestroy } from '@angular/core'
import { Router } from '@angular/router'
import { CommonModule } from '@angular/common'

import { SceneTitleComponent } from '@shared/components/scene-title/scene-title.component'
import { SceneFooterComponent } from '@shared/components/scene-footer/scene-footer.component'
import { CharacterPanelComponent } from '@shared/components/character-panel/character-panel.component'
import { MessageLogComponent } from '@shared/components/message-log/message-log.component'
import { ChestOverlayComponent } from '@shared/components/chest-overlay/chest-overlay.component'

import { Character } from '@models/Character'
import { CharacterAction, CharacterActionEvent } from '@models/CharacterCardTypes'
import { GameStateService } from '@services/GameStateService'
import { MazeStateStore } from '@services/MazeStateStore'
import { ChestOrchestrator } from '@services/ChestOrchestrator'
import { ChestOrchestrationService } from '@services/ChestOrchestrationService'

@Component({
  selector: 'app-chest-scene',
  standalone: true,
  imports: [
    CommonModule,
    SceneTitleComponent,
    SceneFooterComponent,
    CharacterPanelComponent,
    MessageLogComponent,
    ChestOverlayComponent
  ],
  templateUrl: './chest-scene.component.html',
  styleUrls: ['./chest-scene.component.scss']
})
export class ChestSceneComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router)
  private readonly gameState = inject(GameStateService)
  private readonly stateStore = inject(MazeStateStore)
  private readonly chestOrch = inject(ChestOrchestrator)
  private readonly chestOrchestration = inject(ChestOrchestrationService)

  // ============================================================
  // STATE FROM MAZE STATE STORE
  // ============================================================

  readonly chestPhase = computed(() => this.stateStore.chestPhase())
  readonly chestLetterboxType = computed(() => this.stateStore.chestLetterboxType())
  readonly pendingChest = computed(() => this.stateStore.pendingChest())
  readonly chestSprite = computed(() => this.stateStore.chestSprite())
  readonly chestOpener = computed(() => this.stateStore.chestOpener())
  readonly scrambledTrapState = computed(() => this.stateStore.scrambledTrapState())
  readonly chestTrapInput = computed(() => this.stateStore.chestTrapInput())
  readonly chestSummary = computed(() => this.stateStore.chestSummary())
  readonly chestLastMessage = computed(() => this.stateStore.chestLastMessage())
  readonly chestInventoryWarning = computed(() => this.stateStore.chestInventoryWarning())
  readonly trapLetterboxName = computed(() => this.stateStore.trapLetterboxName())
  readonly hitCharacterIds = computed(() => this.stateStore.hitCharacterIds())
  readonly currentDamageIndicator = computed(() => this.stateStore.currentDamageIndicator())
  readonly messages = computed(() => this.stateStore.messages())

  // ============================================================
  // COMPUTED STATE
  // ============================================================

  readonly sceneTitle = computed(() => {
    const chest = this.pendingChest()
    return chest ? `TREASURE CHEST - LEVEL ${chest.mazeLevel}` : 'TREASURE CHEST'
  })

  readonly partyCharacters = computed((): Character[] => {
    const state = this.gameState.state()
    return state.party.members
      .map(id => state.roster.get(id))
      .filter((c): c is Character => !!c)
  })

  readonly leftColumnCharacters = computed(() =>
    this.partyCharacters().filter((_, i) => i % 2 === 0)
  )

  readonly rightColumnCharacters = computed(() =>
    this.partyCharacters().filter((_, i) => i % 2 === 1)
  )

  readonly calfoEligibleCasters = computed(() =>
    this.chestOrch.getCalfoEligibleCasters()
  )

  readonly recommendedChestHandler = computed(() =>
    this.chestOrch.getRecommendedHandler()
  )

  readonly chestInspectChance = computed(() => {
    const opener = this.stateStore.chestOpener()
    if (!opener) return 0
    return this.chestOrch.getInspectChance(opener)
  })

  readonly chestDisarmChance = computed(() => {
    const opener = this.stateStore.chestOpener()
    const chest = this.stateStore.pendingChest()
    if (!opener || !chest) return 0
    return this.chestOrch.getDisarmChance(opener, chest.mazeLevel)
  })

  readonly footerMenuItems = computed(() =>
    this.chestOrch.getChestLeaveMenuItem()
  )

  // ============================================================
  // LIFECYCLE
  // ============================================================

  ngOnInit(): void {
    // Verify we have a chest to interact with
    if (!this.pendingChest()) {
      console.warn('[ChestScene] No pending chest, navigating back to maze')
      this.navigateToMaze()
    }
  }

  ngOnDestroy(): void {
    // Clean up chest state when leaving scene
    // Note: Don't reset if navigating to combat (alarm trap)
    if (this.stateStore.pendingAlarmEncounter() === null) {
      this.stateStore.closeChest()
    }
  }

  // ============================================================
  // CHARACTER PANEL ACTIONS
  // ============================================================

  readonly getChestActionsForCharacter = (char: Character): CharacterAction[] => {
    const chest = this.pendingChest()
    const phase = this.chestPhase()
    const opener = this.chestOpener()

    // Only show actions during action_select phase
    if (phase !== 'action_select') return []

    // If no opener selected yet, show "Select" for available characters
    if (!opener) {
      const available = this.chestOrchestration.getAvailableCharacters(this.partyCharacters())
      if (available.some(c => c.id === char.id)) {
        return [{ type: 'open', label: 'Select' }]
      }
      return []
    }

    // Only opener can perform actions
    if (char.id !== opener.id) return []

    const actions: CharacterAction[] = []

    // Open action - always available
    actions.push({ type: 'open', label: 'Open' })

    // Inspect - only if trap not identified
    if (chest && !chest.trapIdentified) {
      actions.push({ type: 'inspect', label: 'Inspect' })
    }

    // CALFO - only if caster and trap not identified
    if (!chest?.trapIdentified && this.calfoEligibleCasters().some(c => c.id === char.id)) {
      actions.push({ type: 'calfo', label: 'CALFO' })
    }

    // Disarm - only if trap identified and not disarmed
    if (chest?.trapIdentified && chest?.trapped && !chest?.trapDisarmed) {
      actions.push({ type: 'disarm', label: 'Disarm' })
    }

    return actions
  }

  handleChestCardAction(event: CharacterActionEvent): void {
    const { characterId, action } = event
    const party = this.partyCharacters()
    const char = party.find(c => c.id === characterId)
    if (!char) return

    const phase = this.chestPhase()
    const opener = this.chestOpener()

    // If no opener yet and clicking "Select", set as opener
    if (!opener && action.type === 'open') {
      this.chestOrch.selectOpener(char)
      return
    }

    // Only opener can perform actions
    if (opener?.id !== characterId) return

    switch (action.type) {
      case 'open':
        this.chestOrch.handleOpen()
        break
      case 'inspect':
        if (phase === 'trap_display') {
          this.chestOrch.handleInspectMore()
        } else {
          this.chestOrch.handleInspect()
        }
        break
      case 'calfo':
        if (phase === 'trap_display') {
          this.chestOrch.handleCalfoFromTrapDisplay()
        } else {
          this.chestOrch.handleCalfo()
        }
        break
      case 'disarm':
        this.chestOrch.handleDisarm()
        break
    }
  }

  // ============================================================
  // OVERLAY EVENTS
  // ============================================================

  onChestCharacterSelected(index: number): void {
    this.chestOrch.onCharacterSelected(index)
  }

  onChestCasterSelected(index: number): void {
    this.chestOrch.onCasterSelected(index)
  }

  // ============================================================
  // FOOTER ACTIONS
  // ============================================================

  handleFooterAction(itemId: string): void {
    switch (itemId) {
      case 'leave':
        this.chestOrch.handleLeave()
        this.navigateToMaze()
        break
      case 'continue':
        const phase = this.chestPhase()
        if (phase === 'result') {
          this.chestOrch.handleContinue()
          this.navigateToMaze()
        } else {
          this.chestOrch.handleContinue()
        }
        break
      case 'cancel':
        this.chestOrch.handleCancel()
        break
      case 'submit-disarm':
        this.chestOrch.submitTrapName()
        break
      case 'confirm-open':
        this.chestOrch.openChest(true)
        break
    }
  }

  // ============================================================
  // KEYBOARD HANDLING
  // ============================================================

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent): void {
    const key = event.key.toUpperCase()
    const result = this.chestOrch.handleKeyboard(key)

    if (result.preventDefault) {
      event.preventDefault()
    }
    if (result.stopPropagation) {
      event.stopPropagation()
    }

    // Check if we should navigate after key handling
    const phase = this.chestPhase()
    if (phase === 'idle') {
      this.navigateToMaze()
    }
  }

  // ============================================================
  // NAVIGATION
  // ============================================================

  private navigateToMaze(): void {
    this.router.navigate(['/maze'])
  }
}
