import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core'
import { CommonModule } from '@angular/common'
import { Router } from '@angular/router'
import { GameStateService } from '@services/GameStateService'
import { SceneNavigationService } from '@services/SceneNavigationService'
import { MessageService } from '@services/MessageService'
import { HealingService, HealingAction } from '@services/HealingService'
import * as PartyService from '@services/PartyService'
import { PartyAbandonmentService } from '@services/PartyAbandonmentService'
import { EncounterTriggerService, EncounterContext } from '@services/EncounterTriggerService'
import { GameStateQueries } from '@utils/GameStateQueries'
import { MenuItem } from '@shared/components/menu/menu.component'
import { SceneTitleComponent } from '@shared/components/scene-title/scene-title.component'
import { SceneFooterComponent } from '@shared/components/scene-footer/scene-footer.component'
import { CharacterPanelComponent } from '@shared/components/character-panel/character-panel.component'
import { MessageLogComponent } from '@shared/components/message-log/message-log.component'
import { CharacterActionEvent, CharacterAction } from '@models/CharacterCardTypes'
import { SceneType } from '@models/SceneType'
import { Character } from '@models/Character'

/**
 * Camp Component
 *
 * Accessible from Maze, provides:
 * - Party formation management (move up/down)
 * - Character inspection
 * - Intelligent auto-healing
 *
 * Layout mirrors Castle scene with 3-column structure.
 */
@Component({
  selector: 'app-camp',
  standalone: true,
  imports: [
    CommonModule,
    SceneTitleComponent,
    SceneFooterComponent,
    CharacterPanelComponent,
    MessageLogComponent
  ],
  templateUrl: './camp.component.html',
  styleUrls: ['./camp.component.scss']
})
export class CampComponent implements OnInit {
  private readonly gameState = inject(GameStateService)
  private readonly navigation = inject(SceneNavigationService)
  private readonly messages = inject(MessageService)
  private readonly router = inject(Router)

  // Healing state
  readonly isHealing = signal(false)
  readonly healingLog = signal<string[]>([])

  // Abandon party confirmation state
  readonly showAbandonConfirmation = signal<boolean>(false)

  /**
   * All party characters in order
   */
  readonly partyCharacters = computed(() =>
    GameStateQueries.partyCharacters(this.gameState.state())
  )

  /**
   * Characters for left column (positions 1, 3, 5 = indices 0, 2, 4)
   */
  readonly leftColumnCharacters = computed(() => {
    const chars = this.partyCharacters()
    return [chars[0], chars[2], chars[4]].filter(c => c !== undefined)
  })

  /**
   * Characters for right column (positions 2, 4, 6 = indices 1, 3, 5)
   */
  readonly rightColumnCharacters = computed(() => {
    const chars = this.partyCharacters()
    return [chars[1], chars[3], chars[5]].filter(c => c !== undefined)
  })

  /**
   * Actions available for each character (inspect, moveUp, moveDown)
   */
  getActionsForCharacter = (char: Character): CharacterAction[] => {
    const state = this.gameState.state()
    return [
      { type: 'inspect' },
      { type: 'moveUp', enabled: GameStateQueries.canMoveUp(state, char.id) },
      { type: 'moveDown', enabled: GameStateQueries.canMoveDown(state, char.id) }
    ]
  }

  /**
   * Footer menu items
   */
  readonly footerMenuItems = computed((): MenuItem[] => {
    const state = this.gameState.state()
    const canHeal = HealingService.partyNeedsHealing(state) &&
                    HealingService.hasHealingSpellsAvailable(state)
    const busy = this.isHealing()

    return [
      { id: 'heal', label: 'Cast Healing', shortcut: 'H', enabled: canHeal && !busy },
      { id: 'abandon', label: 'Abandon', shortcut: 'X', enabled: !busy },
      { id: 'return', label: 'Return to Maze', shortcut: 'ESC', enabled: !busy }
    ]
  })

  ngOnInit(): void {
    this.gameState.updateState(state => ({
      ...state,
      currentScene: SceneType.CAMP
    }))
  }

  /**
   * Handle character action clicks (inspect, moveUp, moveDown)
   */
  handleActionClick(event: CharacterActionEvent): void {
    switch (event.actionType) {
      case 'inspect':
        this.navigation.inspectCharacter(event.characterId, 'camp')
        break
      case 'moveUp':
        this.gameState.updateState(state =>
          PartyService.moveCharacterUp(state, event.characterId)
        )
        break
      case 'moveDown':
        this.gameState.updateState(state =>
          PartyService.moveCharacterDown(state, event.characterId)
        )
        break
    }
  }

  /**
   * Handle footer menu actions
   */
  handleFooterAction(itemId: string): void {
    switch (itemId) {
      case 'heal':
        this.executeHealingSequence()
        break
      case 'abandon':
        this.promptAbandonParty()
        break
      case 'return':
        this.returnToMaze()
        break
    }
  }

  @HostListener('window:keydown.x')
  handleAbandonShortcut(): void {
    if (this.isHealing() || this.showAbandonConfirmation()) return
    this.promptAbandonParty()
  }

  /**
   * Return to maze scene
   */
  private returnToMaze(): void {
    this.navigation.enterMaze()
  }

  /**
   * Execute intelligent healing sequence
   * Heals party members one at a time with animation delay
   * Each spell cast triggers a random encounter check (1% chance like dungeon movement)
   */
  async executeHealingSequence(): Promise<void> {
    this.isHealing.set(true)
    this.healingLog.set([])

    let totalHealed = 0
    let spellsCast = 0

    console.log('[Healing] Starting healing sequence...')

    let state = this.gameState.state()
    let action = HealingService.getNextHealingAction(state)

    while (action) {
      // Log the decision
      console.log(`[Healing] ${action.casterName} will cast ${action.spellName} on ${action.targetName}`)

      const { newState, result } = HealingService.executeHealingAction(state, action)
      state = newState

      // Update game state (triggers UI update)
      this.gameState.updateState(() => state)

      // Add to healing log
      this.healingLog.update(msgs => [...msgs, result.message])
      totalHealed += result.healAmount
      spellsCast++

      console.log(`[Healing] ${result.message}`)

      // Delay between heals for animation
      await this.delay(500)

      // Check for random encounter after each spell (1% chance like dungeon movement)
      if (this.checkForRandomEncounter()) {
        console.log('[Healing] Random encounter triggered during healing!')
        this.healingLog.update(msgs => [...msgs, 'You hear monsters approaching!'])
        await this.delay(500)

        // Set flag for maze to pick up and initiate combat
        this.gameState.updateState(s => ({
          ...s,
          dungeon: s.dungeon ? { ...s.dungeon, pendingCampEncounter: true } : undefined
        }))

        this.isHealing.set(false)
        this.navigation.enterMaze()
        return  // Exit immediately - combat will start in maze
      }

      // Get next action (state has changed)
      action = HealingService.getNextHealingAction(state)
    }

    // Show summary
    if (spellsCast > 0) {
      const summary = `Healing complete: ${spellsCast} spell${spellsCast > 1 ? 's' : ''} cast, ${totalHealed} HP restored.`
      this.messages.showSuccess(summary)
      console.log(`[Healing] ${summary}`)
    } else {
      this.messages.showInfo('No healing needed or no spells available.')
      console.log('[Healing] No healing performed.')
    }

    this.isHealing.set(false)
  }

  /**
   * Check for random encounter during camp healing
   * Uses the same 1% chance as dungeon movement
   */
  private checkForRandomEncounter(): boolean {
    const state = this.gameState.state()
    const dungeon = state.dungeon
    if (!dungeon) return false

    // Skip if encounters are disabled (for testing)
    if (!state.settings.encountersEnabled) return false

    // Build minimal context for random encounter check only
    const context: EncounterContext = {
      level: dungeon.currentLevel,
      x: dungeon.position.x,
      y: dungeon.position.y,
      isDoorKick: false,
      chestAlarmActive: false,
      isRoomTile: false,  // Treat as corridor - only 1% random check applies
      fixedEncounterConfig: undefined
    }

    const result = EncounterTriggerService.checkForEncounter(context)
    return result.trigger
  }

  /**
   * Helper: Promise-based delay for animation
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Show abandon party confirmation dialog
   */
  promptAbandonParty(): void {
    this.showAbandonConfirmation.set(true)
  }

  /**
   * Confirm party abandonment - kill all members, leave bodies, return to castle
   */
  confirmAbandon(): void {
    this.gameState.updateState(state =>
      PartyAbandonmentService.abandonParty(state)
    )
    this.showAbandonConfirmation.set(false)
    this.router.navigate(['/castle-menu'])
  }

  /**
   * Cancel abandon confirmation
   */
  cancelAbandon(): void {
    this.showAbandonConfirmation.set(false)
  }
}
